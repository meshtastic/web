import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  applyChannelImport,
  createChannelImportPlan,
  encodeChannelShare,
  parseChannelShare,
} from "./channelShare.ts";

function settings(name: string) {
  return create(Protobuf.Channel.ChannelSettingsSchema, {
    name,
    psk: new Uint8Array([1]),
  });
}

function channel(
  index: number,
  role: Protobuf.Channel.Channel_Role,
  name?: string,
) {
  return create(Protobuf.Channel.ChannelSchema, {
    index,
    role,
    settings: name ? settings(name) : undefined,
  });
}

const loraConfig = create(Protobuf.Config.Config_LoRaConfigSchema, {
  region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
});

describe("channel share URLs", () => {
  it("encodes a Replace share with its LoRa configuration", () => {
    const url = encodeChannelShare({
      mode: "replace",
      settings: [settings("Primary")],
      loraConfig,
    });

    expect(url).toMatch(/^https:\/\/meshtastic\.org\/e\/#/);
    expect(parseChannelShare(url)).toMatchObject({
      mode: "replace",
      addOnly: false,
      channelSet: { loraConfig, settings: [{ name: "Primary" }] },
    });
  });

  it("encodes an Add share without LoRa configuration", () => {
    const url = encodeChannelShare({
      mode: "add",
      settings: [settings("Secondary")],
      loraConfig,
    });

    expect(url).toContain("/e/?add=true#");
    const parsed = parseChannelShare(url);
    expect(parsed).toMatchObject({
      mode: "add",
      addOnly: true,
      channelSet: { settings: [{ name: "Secondary" }] },
    });
    expect(parsed.channelSet.loraConfig).toBeUndefined();
  });

  it("accepts the historic add marker after the fragment", () => {
    const canonical = encodeChannelShare({
      mode: "add",
      settings: [settings("Legacy")],
    });
    const legacy = canonical.replace("?add=true#", "#") + "?add=true";

    expect(parseChannelShare(legacy)).toMatchObject({
      mode: "add",
      addOnly: true,
      channelSet: { settings: [{ name: "Legacy" }] },
    });
  });

  it("rejects foreign, malformed, ambiguous, and empty channel shares", () => {
    const valid = encodeChannelShare({
      mode: "replace",
      settings: [settings("Valid")],
    });

    expect(() => parseChannelShare("https://example.com/e/#AA")).toThrow();
    expect(() =>
      parseChannelShare(valid.replace("https://", "https://user@")),
    ).toThrow();
    expect(() =>
      parseChannelShare(
        valid.replace("https://meshtastic.org", "https://meshtastic.org:8443"),
      ),
    ).toThrow();
    expect(() =>
      parseChannelShare(valid.replace("#", "?add=true&add=true#")),
    ).toThrow();
    expect(() =>
      parseChannelShare("https://meshtastic.org/e/#not base64"),
    ).toThrow();
    expect(() => parseChannelShare("https://meshtastic.org/e/#")).toThrow();
  });
});

describe("channel import plans", () => {
  const existing = [
    channel(0, Protobuf.Channel.Channel_Role.PRIMARY, "Primary"),
    channel(1, Protobuf.Channel.Channel_Role.SECONDARY, "Existing"),
    channel(2, Protobuf.Channel.Channel_Role.DISABLED),
    channel(3, Protobuf.Channel.Channel_Role.DISABLED),
  ];

  it("defaults a replace-capable share to Replace, clears stale secondary slots, and applies LoRa", () => {
    const parsed = parseChannelShare(
      encodeChannelShare({
        mode: "replace",
        settings: [settings("Replacement")],
        loraConfig,
      }),
    );

    expect(createChannelImportPlan(parsed, existing, "replace")).toMatchObject({
      mode: "replace",
      canApply: true,
      applyLora: true,
      assignments: [{ incomingIndex: 0, targetIndex: 0 }],
      disabledIndexes: [1, 2, 3, 4, 5, 6, 7],
    });
  });

  it("locks add-only shares to Add and preserves LoRa", () => {
    const parsed = parseChannelShare(
      encodeChannelShare({ mode: "add", settings: [settings("New")] }),
    );

    expect(createChannelImportPlan(parsed, existing, "replace")).toMatchObject({
      mode: "add",
      addOnly: true,
      canApply: true,
      applyLora: false,
      assignments: [{ incomingIndex: 0, targetIndex: 2 }],
    });
  });

  it("blocks Add before writes when a channel name conflicts", () => {
    const parsed = parseChannelShare(
      encodeChannelShare({ mode: "replace", settings: [settings("existing")] }),
    );

    expect(createChannelImportPlan(parsed, existing, "add")).toMatchObject({
      mode: "add",
      canApply: false,
      applyLora: false,
      duplicateNames: ["existing"],
    });
  });

  it("blocks Add when there are not enough free secondary slots", () => {
    const full = Array.from({ length: 8 }, (_, index) =>
      channel(
        index,
        index === 0
          ? Protobuf.Channel.Channel_Role.PRIMARY
          : Protobuf.Channel.Channel_Role.SECONDARY,
        `Existing ${index}`,
      ),
    );
    const parsed = parseChannelShare(
      encodeChannelShare({ mode: "replace", settings: [settings("New")] }),
    );

    expect(createChannelImportPlan(parsed, full, "add")).toMatchObject({
      mode: "add",
      canApply: false,
      availableSlots: [],
      capacityShortfall: 1,
    });
  });

  it("treats missing secondary channel indexes as free slots", () => {
    const parsed = parseChannelShare(
      encodeChannelShare({ mode: "replace", settings: [settings("New")] }),
    );

    expect(
      createChannelImportPlan(parsed, existing.slice(0, 2), "add"),
    ).toMatchObject({
      availableSlots: [2, 3, 4, 5, 6, 7],
      assignments: [{ incomingIndex: 0, targetIndex: 2 }],
      canApply: true,
    });
  });

  it("stages a complete Replace and commits it as one editor transaction", async () => {
    const parsed = parseChannelShare(
      encodeChannelShare({
        mode: "replace",
        settings: [settings("Replacement")],
        loraConfig,
      }),
    );
    const plan = createChannelImportPlan(parsed, existing, "replace");
    const calls: string[] = [];
    const editor = {
      setChannel: (value: Protobuf.Channel.Channel) => {
        calls.push(`channel:${value.index}:${value.role}`);
      },
      setRadioSection: () => calls.push("lora"),
      commit: async () => {
        calls.push("commit");
        return { status: "ok" as const };
      },
    };

    await applyChannelImport(editor, parsed, plan, undefined);

    expect(calls).toEqual([
      `channel:0:${Protobuf.Channel.Channel_Role.PRIMARY}`,
      `channel:1:${Protobuf.Channel.Channel_Role.DISABLED}`,
      `channel:2:${Protobuf.Channel.Channel_Role.DISABLED}`,
      `channel:3:${Protobuf.Channel.Channel_Role.DISABLED}`,
      `channel:4:${Protobuf.Channel.Channel_Role.DISABLED}`,
      `channel:5:${Protobuf.Channel.Channel_Role.DISABLED}`,
      `channel:6:${Protobuf.Channel.Channel_Role.DISABLED}`,
      `channel:7:${Protobuf.Channel.Channel_Role.DISABLED}`,
      "lora",
      "commit",
    ]);
  });

  it("propagates an editor commit error without clearing the staged import", async () => {
    const parsed = parseChannelShare(
      encodeChannelShare({ mode: "replace", settings: [settings("New")] }),
    );
    const plan = createChannelImportPlan(parsed, existing, "replace");
    const error = new Error("device rejected import");
    const editor = {
      setChannel: () => {},
      setRadioSection: () => {},
      commit: async () => ({ status: "error" as const, error }),
    };

    await expect(
      applyChannelImport(editor, parsed, plan, undefined),
    ).rejects.toThrow(error);
  });
});
