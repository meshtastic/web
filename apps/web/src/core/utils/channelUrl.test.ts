import { create, fromBinary } from "@bufbuild/protobuf";
import { base64Decode } from "@bufbuild/protobuf/wire";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  channelSetFromUrl,
  channelSetToUrl,
  parseChannelUrl,
} from "./channelUrl.ts";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

/**
 * The default LongFast channel with use_preset, hop limit 3 and TX on, as
 * the Python CLI encodes it (the fixture Meshtastic-Android's
 * ChannelSetUrlTest uses).
 */
const PAYLOAD = "CgMSAQESBggBQANIAQ";
const REPLACE_URL = `https://meshtastic.org/e/#${PAYLOAD}`;

/** The ChannelSet bytes in a URL's fragment, without the parser's add handling. */
function encodedChannelSet(url: string): Protobuf.AppOnly.ChannelSet {
  const fragment = new URL(url).hash.substring(1).split("?")[0] ?? "";
  const standard = fragment.replace(/-/g, "+").replace(/_/g, "/");
  return fromBinary(
    Protobuf.AppOnly.ChannelSetSchema,
    base64Decode(
      standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "="),
    ),
  );
}

function channelSet(count: number): Protobuf.AppOnly.ChannelSet {
  return create(Protobuf.AppOnly.ChannelSetSchema, {
    settings: Array.from({ length: count }, (_, i) =>
      create(Protobuf.Channel.ChannelSettingsSchema, {
        name: `Conference-${i}`,
        psk: new Uint8Array([i, i + 16]),
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          positionPrecision: i,
        }),
      }),
    ),
    loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {
      usePreset: true,
      modemPreset: Preset.LONG_FAST,
      region: Region.US,
      hopLimit: 5,
      channelNum: 13,
      txEnabled: true,
    }),
  });
}

describe("parseChannelUrl", () => {
  it("reads the CLI's default channel with its LoRa settings", () => {
    const { channelSet: set, add } = parseChannelUrl(REPLACE_URL);
    expect(add).toBe(false);
    expect(set.settings).toHaveLength(1);
    expect(set.settings[0]?.psk).toEqual(new Uint8Array([1]));
    expect(set.loraConfig?.usePreset).toBe(true);
    expect(set.loraConfig?.hopLimit).toBe(3);
    expect(set.loraConfig?.txEnabled).toBe(true);
  });

  it.each([
    ["www host", `https://www.meshtastic.org/e/#${PAYLOAD}`],
    ["upper-case prefix", `HTTPS://MESHTASTIC.ORG/E/#${PAYLOAD}`],
    ["mixed-case host", `HTTPS://mEsHtAsTiC.OrG/e/#${PAYLOAD}`],
    ["path without trailing slash", `https://meshtastic.org/e#${PAYLOAD}`],
    ["legacy /channel/e/ path", `https://meshtastic.org/channel/e/#${PAYLOAD}`],
    ["padded base64", `https://meshtastic.org/e/#${PAYLOAD}==`],
  ])("accepts the %s", (_, url) => {
    expect(parseChannelUrl(url).channelSet.loraConfig?.usePreset).toBe(true);
  });

  it.each([
    ["a foreign host with /e/", `https://example.com/e/#${PAYLOAD}`],
    ["a look-alike host", `https://meshtastic.org.evil.test/e/#${PAYLOAD}`],
    ["a meshtastic.org subdomain", `https://e.meshtastic.org/e/#${PAYLOAD}`],
    ["the contact path", `https://meshtastic.org/v/#${PAYLOAD}`],
    ["another meshtastic.org path", `https://meshtastic.org/docs/#${PAYLOAD}`],
    ["the site root", `https://meshtastic.org/#${PAYLOAD}`],
    [
      "a path segment that only contains e",
      `https://meshtastic.org/ee/#${PAYLOAD}`,
    ],
    ["no fragment", "https://meshtastic.org/e/"],
    ["an empty fragment", "https://meshtastic.org/e/#"],
    [
      "a fragment that only holds parameters",
      "https://meshtastic.org/e/#?add=true",
    ],
    ["a fragment that isn't base64", "https://meshtastic.org/e/#!!!!"],
    ["base64 that isn't a ChannelSet", "https://meshtastic.org/e/#Cv8="],
    ["text that isn't a URL", "meshtastic.org/e/#CgMSAQE"],
  ])("rejects %s", (_, url) => {
    expect(() => parseChannelUrl(url)).toThrow();
  });

  it.each([
    ["query", `https://meshtastic.org/e/?add=true#${PAYLOAD}`],
    [
      "query, any value but false or 0",
      `https://meshtastic.org/e/?add=yes#${PAYLOAD}`,
    ],
    ["query without a value", `https://meshtastic.org/e/?add#${PAYLOAD}`],
    ["legacy fragment", `${REPLACE_URL}?add=true`],
    [
      "legacy fragment with other parameters",
      `${REPLACE_URL}?source=ios&add=true`,
    ],
    ["legacy fragment, any case", `${REPLACE_URL}?ADD=TRUE`],
    ["legacy fragment without a value", `${REPLACE_URL}?add`],
  ])("reads the add flag from the %s and drops the LoRa settings", (_, url) => {
    const { channelSet: set, add } = parseChannelUrl(url);
    expect(add).toBe(true);
    expect(set.settings).toHaveLength(1);
    expect(set.loraConfig).toBeUndefined();
  });

  it.each([
    [
      "add=false in the query",
      `https://meshtastic.org/e/?add=false#${PAYLOAD}`,
    ],
    ["add=0 in the query", `https://meshtastic.org/e/?add=0#${PAYLOAD}`],
    ["add=false in the fragment", `${REPLACE_URL}?add=false`],
    ["add=1 in the fragment", `${REPLACE_URL}?add=1`],
    ["another fragment parameter", `${REPLACE_URL}?source=ios`],
  ])("treats %s as a replace link", (_, url) => {
    const { channelSet: set, add } = parseChannelUrl(url);
    expect(add).toBe(false);
    expect(set.loraConfig).toBeDefined();
  });

  it("decodes a percent-encoded fragment, as Android does", () => {
    const { channelSet: set, add } = parseChannelUrl(
      `https://meshtastic.org/e/#${PAYLOAD}%3D%3D%3Fadd%3Dtrue`,
    );
    expect(add).toBe(true);
    expect(set.settings).toHaveLength(1);
    expect(
      parseChannelUrl(`${REPLACE_URL}%3D%3D`).channelSet.loraConfig,
    ).toBeDefined();
  });

  it("rejects a fragment with a malformed escape", () => {
    expect(() => parseChannelUrl(`${REPLACE_URL}%E0%A4%A`)).toThrow();
  });

  it("lets the fragment's add flag win over the query's", () => {
    expect(
      parseChannelUrl(`https://meshtastic.org/e/?add=true#${PAYLOAD}?add=false`)
        .add,
    ).toBe(false);
  });
});

describe("channelSetToUrl", () => {
  it("writes the canonical replace URL", () => {
    const url = channelSetToUrl(channelSet(1));
    expect(url).toMatch(/^https:\/\/meshtastic\.org\/e\/#[A-Za-z0-9_-]+$/);
  });

  it("writes an add URL with the flag in the query", () => {
    const url = channelSetToUrl(channelSet(1), { add: true });
    expect(url).toMatch(
      /^https:\/\/meshtastic\.org\/e\/\?add=true#[A-Za-z0-9_-]+$/,
    );
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "round-trips %i channels as replace and add; add carries no LoRa",
    (count) => {
      const original = channelSet(count);
      const replaceUrl = channelSetToUrl(original);
      const addUrl = channelSetToUrl(original, { add: true });

      expect(encodedChannelSet(replaceUrl).settings).toEqual(original.settings);
      expect(encodedChannelSet(replaceUrl).loraConfig).toEqual(
        original.loraConfig,
      );
      expect(channelSetFromUrl(replaceUrl)).toEqual(original);

      expect(encodedChannelSet(addUrl).settings).toEqual(original.settings);
      expect(encodedChannelSet(addUrl).loraConfig).toBeUndefined();
      const add = parseChannelUrl(addUrl);
      expect(add.add).toBe(true);
      expect(add.channelSet.settings).toEqual(original.settings);
      expect(add.channelSet.loraConfig).toBeUndefined();
    },
  );

  it("leaves the caller's ChannelSet alone when writing an add link", () => {
    const original = channelSet(1);
    channelSetToUrl(original, { add: true });
    expect(original.loraConfig).toBeDefined();
  });
});
