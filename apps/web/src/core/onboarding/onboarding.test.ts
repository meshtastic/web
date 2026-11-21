import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  detectBrowserFeatures,
  isHttpsRequired,
  transportSupport,
} from "./capabilities.ts";
import {
  isDefaultPublicChannel,
  parseChannelLink,
  planChannelImport,
} from "./channelImport.ts";
import { parseRegion, regionChoices } from "./region.ts";
import { syncView } from "./syncProgress.ts";
import { httpTarget, isProfileValid, validateProfile } from "./validation.ts";
import {
  hasEverConnected,
  isWelcomeDismissed,
  markWelcomeDismissed,
  shouldShowWelcome,
  WELCOME_DISMISSED_KEY,
} from "./welcome.ts";

const settings = (name: string, psk: number[] = [1]) =>
  create(Protobuf.Channel.ChannelSettingsSchema, {
    name,
    psk: new Uint8Array(psk),
  });

describe("transportSupport", () => {
  it("offers everything in a Chromium browser", () => {
    const support = transportSupport({ bluetooth: true, serial: true });
    expect(support.httpOnly).toBe(false);
    expect(support.defaultMethod).toBe("bluetooth");
  });

  it("falls back to USB when only Bluetooth is missing", () => {
    const support = transportSupport({ bluetooth: false, serial: true });
    expect(support.available).toEqual({
      bluetooth: false,
      serial: true,
      http: true,
    });
    expect(support.httpOnly).toBe(false);
    expect(support.defaultMethod).toBe("serial");
  });

  it("is HTTP only without either API", () => {
    const support = transportSupport({ bluetooth: false, serial: false });
    expect(support.httpOnly).toBe(true);
    expect(support.defaultMethod).toBe("http");
  });
});

describe("detectBrowserFeatures", () => {
  it("treats a missing navigator as unsupported", () => {
    expect(detectBrowserFeatures(undefined)).toEqual({
      bluetooth: false,
      serial: false,
    });
  });
});

describe("shouldShowWelcome", () => {
  const ready = { hydrated: true, dismissed: false };

  const history = (
    nodeNums: Array<number | undefined>,
    deviceNodeNums: Array<number | undefined> = [],
  ) => ({
    savedConnections: nodeNums.map((nodeNum) => ({ nodeNum })),
    deviceNodeNums,
  });

  it("shows for a browser that never reached a radio", () => {
    expect(shouldShowWelcome(history([]), ready)).toBe(true);
    expect(shouldShowWelcome(history([undefined]), ready)).toBe(true);
    expect(shouldShowWelcome(history([], [undefined]), ready)).toBe(true);
  });

  it("waits for the saved connections to load", () => {
    expect(
      shouldShowWelcome(history([]), { hydrated: false, dismissed: false }),
    ).toBe(false);
  });

  it("stays away once a radio has connected or it was dismissed", () => {
    expect(hasEverConnected(history([1234]))).toBe(true);
    expect(shouldShowWelcome(history([1234]), ready)).toBe(false);
    expect(
      shouldShowWelcome(history([]), { hydrated: true, dismissed: true }),
    ).toBe(false);
  });

  it("counts a device remembered from before connections kept node numbers", () => {
    expect(shouldShowWelcome(history([undefined], [99]), ready)).toBe(false);
  });

  it("persists the dismissed flag and survives failing storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    expect(isWelcomeDismissed(storage)).toBe(false);
    markWelcomeDismissed(storage);
    expect(store.get(WELCOME_DISMISSED_KEY)).toBe("1");
    expect(isWelcomeDismissed(storage)).toBe(true);

    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(isWelcomeDismissed(broken)).toBe(false);
    expect(() => markWelcomeDismissed(broken)).not.toThrow();
  });
});

describe("validateProfile", () => {
  it("accepts names within the byte limits", () => {
    const errors = validateProfile({
      longName: "EAO1 Downtown",
      shortName: "EAO1",
    });
    expect(errors).toEqual({});
    expect(isProfileValid(errors)).toBe(true);
  });

  it("requires both names", () => {
    expect(validateProfile({ longName: " ", shortName: "" })).toEqual({
      longName: "required",
      shortName: "required",
    });
  });

  it("counts bytes, not characters", () => {
    // Each é is two bytes: 13 of them are 26 bytes.
    expect(
      validateProfile({ longName: "é".repeat(13), shortName: "AB" }).longName,
    ).toBe("tooLong");
    expect(
      validateProfile({ longName: "é".repeat(12), shortName: "AB" }),
    ).toEqual({});
    // One 4-byte emoji fills the short name; two are too long.
    expect(validateProfile({ longName: "x", shortName: "📡" })).toEqual({});
    const errors = validateProfile({ longName: "x", shortName: "📡📡" });
    expect(errors.shortName).toBe("tooLong");
    expect(isProfileValid(errors)).toBe(false);
  });
});

describe("httpTarget", () => {
  const unwrap = (r: Result<string, string>) =>
    Result.isOk(r) ? r.value : `error:${r.error}`;

  it("adds the scheme the HTTPS switch picks", () => {
    expect(unwrap(httpTarget("meshtastic.local", false))).toBe(
      "http://meshtastic.local",
    );
    expect(unwrap(httpTarget(" 192.168.1.50 ", true))).toBe(
      "https://192.168.1.50",
    );
  });

  it("replaces a typed scheme", () => {
    expect(unwrap(httpTarget("http://10.0.0.2:8080", true))).toBe(
      "https://10.0.0.2:8080",
    );
  });

  it("rejects empty and malformed addresses", () => {
    expect(unwrap(httpTarget("  ", false))).toBe("error:empty");
    expect(unwrap(httpTarget("not a host", false))).toBe("error:invalid");
  });
});

describe("parseChannelLink", () => {
  const set = create(Protobuf.AppOnly.ChannelSetSchema, {
    settings: [settings("Hikers", [9, 9])],
  });

  it("decodes a share link, with or without the add flag", () => {
    for (const url of [
      channelSetToUrl(set),
      channelSetToUrl(set, { add: true }),
    ]) {
      const parsed = parseChannelLink(url);
      expect(Result.isOk(parsed) && parsed.value.settings[0]?.name).toBe(
        "Hikers",
      );
    }
  });

  it("reports empty, invalid and channel-less links", () => {
    const errorOf = (input: string) => {
      const r = parseChannelLink(input);
      return Result.isError(r) ? r.error : undefined;
    };
    expect(errorOf("")).toBe("empty");
    expect(errorOf("hello")).toBe("invalid");
    expect(
      errorOf(
        channelSetToUrl(
          create(Protobuf.AppOnly.ChannelSetSchema, {
            loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {
              hopLimit: 3,
            }),
          }),
        ),
      ),
    ).toBe("noChannels");
  });
});

describe("planChannelImport", () => {
  const primary = settings("");
  const link = create(Protobuf.AppOnly.ChannelSetSchema, {
    settings: [settings("Hikers", [2]), settings("Ops", [3])],
    loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {}),
  });

  it("adds into free secondary slots", () => {
    const plan = planChannelImport(
      link,
      [primary, settings("Taken", [4])],
      "add",
    );
    expect(plan.assignments).toEqual([
      { from: 0, slot: 2, role: "secondary" },
      { from: 1, slot: 3, role: "secondary" },
    ]);
    expect(plan.applyLora).toBe(false);
    expect(plan.disable).toEqual([]);
  });

  it("leaves out channels the radio already has", () => {
    const plan = planChannelImport(
      link,
      [primary, settings("Hikers", [2])],
      "add",
    );
    expect(plan.assignments).toEqual([{ from: 1, slot: 2, role: "secondary" }]);
    expect(plan.skipped).toBe(1);
  });

  it("counts channels with no free slot", () => {
    const fullTable = Array.from({ length: 8 }, (_, i) =>
      settings(`c${i}`, [i + 10]),
    );
    const plan = planChannelImport(link, fullTable, "add");
    expect(plan.assignments).toEqual([]);
    expect(plan.skipped).toBe(2);
  });

  it("replaces from the primary and clears the rest", () => {
    const current = [
      primary,
      settings("A", [5]),
      undefined,
      settings("B", [6]),
    ];
    const plan = planChannelImport(link, current, "replace");
    expect(plan.assignments).toEqual([
      { from: 0, slot: 0, role: "primary" },
      { from: 1, slot: 1, role: "secondary" },
    ]);
    expect(plan.disable).toEqual([3]);
    expect(plan.applyLora).toBe(true);
  });

  it("recognises the default public channel", () => {
    expect(isDefaultPublicChannel(primary)).toBe(true);
    expect(isDefaultPublicChannel(settings("Hikers"))).toBe(false);
    expect(isDefaultPublicChannel(undefined)).toBe(false);
  });
});

describe("syncView", () => {
  const counters = {
    config: 3,
    modules: 0,
    channels: 1,
    nodes: 12,
    myInfo: true,
    metadata: true,
  };

  it("is connecting before the handshake starts", () => {
    const view = syncView("connecting", { phase: "idle" });
    expect(view.phase).toBe("connecting");
    expect(view.rows.map((r) => r.state)).toEqual([
      "active",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("ticks settings and counts while configuring", () => {
    const view = syncView("configuring", {
      phase: "configuring",
      received: counters,
    });
    expect(view.phase).toBe("syncing");
    expect(view.rows).toEqual([
      { id: "connection", state: "done" },
      { id: "settings", state: "done" },
      { id: "channels", state: "active", count: 1 },
      { id: "nodes", state: "active", count: 12 },
    ]);
  });

  it("is ready once configured", () => {
    const view = syncView("configured", {
      phase: "configured",
      received: counters,
    });
    expect(view.phase).toBe("ready");
    expect(view.rows.every((r) => r.state === "done")).toBe(true);
  });
});

describe("regionChoices", () => {
  const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

  it("drops UNSET and names each region by its code", () => {
    const choices = regionChoices(
      [Region.UNSET, Region.US, Region.EU_868, Region.ITU2_70CM],
      [Region.ITU2_70CM],
    );
    expect(choices).toEqual([
      { value: Region.US, code: "US", licensedOnly: false },
      { value: Region.EU_868, code: "EU_868", licensedOnly: false },
      { value: Region.ITU2_70CM, code: "ITU2_70CM", licensedOnly: true },
    ]);
    expect(parseRegion(String(Region.EU_868), choices)).toBe(Region.EU_868);
    expect(parseRegion("999", choices)).toBeUndefined();
  });
});

describe("isHttpsRequired", () => {
  it("forces HTTPS on an HTTPS page until Local Network Access is known", () => {
    expect(isHttpsRequired(false, "unsupported")).toBe(false);
    expect(isHttpsRequired(true, "unknown")).toBe(true);
    expect(isHttpsRequired(true, "unsupported")).toBe(true);
    expect(isHttpsRequired(true, "granted")).toBe(false);
    expect(isHttpsRequired(true, "prompt")).toBe(false);
  });
});
