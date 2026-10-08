import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";

import { LINE_COLOR, getSignalColor } from "./signalColor.ts";
import {
  getSnrLimit,
  rateSignalQuality,
  type SignalQuality,
} from "./signalQuality.ts";

type Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

const preset = (name: string): Preset =>
  Protobuf.Config.Config_LoRaConfig_ModemPreset[
    name as keyof typeof Protobuf.Config.Config_LoRaConfig_ModemPreset
  ];

describe("getSnrLimit", () => {
  it("follows spreading-factor demodulation floors per preset", () => {
    // Mirrors Android LoraSignalIndicatorTest.snrLimit assertions.
    expect(getSnrLimit(preset("SHORT_FAST"))).toBe(-7.5); // SF7
    expect(getSnrLimit(preset("SHORT_TURBO"))).toBe(-7.5); // SF7
    expect(getSnrLimit(preset("SHORT_SLOW"))).toBe(-10); // SF8
    expect(getSnrLimit(preset("MEDIUM_FAST"))).toBe(-12.5); // SF9
    expect(getSnrLimit(preset("MEDIUM_SLOW"))).toBe(-15); // SF10
    expect(getSnrLimit(preset("LONG_FAST"))).toBe(-17.5); // SF11
    expect(getSnrLimit(preset("LONG_MODERATE"))).toBe(-17.5); // SF11
    expect(getSnrLimit(preset("LONG_TURBO"))).toBe(-12.5);
  });

  it("uses physically-correct SF12 floor for LONG_SLOW and VERY_LONG_SLOW", () => {
    // Meshtastic-Apple returns -7.5 here (the SF7 value, an apparent bug);
    // Android documents this in ChannelOption.kt and uses -20. We follow
    // Android + physics, per meshtastic/web#1241 discussion.
    expect(getSnrLimit(preset("LONG_SLOW"))).toBe(-20);
    if (preset("VERY_LONG_SLOW") !== undefined) {
      expect(getSnrLimit(preset("VERY_LONG_SLOW"))).toBe(-20);
    }
  });

  it("covers every preset in the vendored protobuf enum", () => {
    const members = Object.keys(
      Protobuf.Config.Config_LoRaConfig_ModemPreset,
    ).filter((k) => Number.isNaN(Number(k)));
    for (const member of members) {
      expect(getSnrLimit(preset(member)), member).toBeTypeOf("number");
    }
  });

  it("falls back to the LONG_FAST default limit for unknown presets", () => {
    expect(getSnrLimit(undefined)).toBe(-17.5);
    expect(getSnrLimit(999 as Preset)).toBe(-17.5);
  });

  it("accepts preset names as strings", () => {
    expect(getSnrLimit("SHORT_FAST")).toBe(-7.5);
    expect(rateSignalQuality(-15, "LONG_SLOW")).toBe("good");
    expect(rateSignalQuality(-15, "SHORT_FAST")).toBe("bad");
  });

  it("covers MEDIUM_TURBO ahead of the SDK dep bump", () => {
    // protobufs master defines value 16; this repo's vendored copy does not
    // yet. Name-keyed entry activates automatically when it lands.
    expect(getSnrLimit("MEDIUM_TURBO")).toBe(-12.5);
  });
});

describe("rateSignalQuality — preset-relative SNR bands", () => {
  it("rates the same SNR relative to the active preset", () => {
    // -15 dB is comfortably above LongSlow's -20 floor but below ShortFast's -7.5.
    expect(rateSignalQuality(-15, preset("LONG_SLOW"))).toBe("good");
    expect(rateSignalQuality(-15, preset("SHORT_FAST"))).toBe("bad");
  });

  it("rates -10 dB GOOD on LongFast (the original bug's example)", () => {
    // A fixed threshold called this BAD; on LongFast it is 7.5 dB above the floor.
    expect(rateSignalQuality(-10, preset("LONG_FAST"))).toBe("good");
  });

  it("draws quality bands around the LongFast floor", () => {
    const p = preset("LONG_FAST"); // limit = -17.5
    expect(rateSignalQuality(-17, p)).toBe("good"); // margin > 0
    expect(rateSignalQuality(-17.5, p)).toBe("fair"); // at limit
    expect(rateSignalQuality(-22, p)).toBe("fair"); // > limit-5.5 (-23)
    expect(rateSignalQuality(-23, p)).toBe("bad"); // >= limit-7.5 (-25)
    expect(rateSignalQuality(-30, p)).toBe("none"); // < limit-7.5
  });

  it("treats zero SNR as a reading, not an absence", () => {
    // 0 dB sits above every preset's demod floor.
    expect(rateSignalQuality(0, preset("LONG_FAST"))).toBe("good");
    expect(rateSignalQuality(0, preset("SHORT_FAST"))).toBe("good");
  });
});

describe("rateSignalQuality — fallback RSSI blend (no noise floor)", () => {
  const p = preset("LONG_FAST"); // limit = -17.5

  it("returns SNR-only rating when rssi is absent or zero", () => {
    expect(rateSignalQuality(-16, p)).toBe("good");
    expect(rateSignalQuality(-16, p, 0)).toBe("good");
    expect(rateSignalQuality(-30, p, 0)).toBe("none");
    expect(rateSignalQuality(-16, p, undefined)).toBe("good");
  });

  it("applies the fixed-RSSI blend exactly as specified", () => {
    // Good: rssi > -115 && snr > limit
    expect(rateSignalQuality(-17, p, -110)).toBe("good");
    // Good fails when rssi <= -115 even with snr > limit → falls through:
    // not None (rssi not < -126), Bad requires rssi <= -120 || snr <= limit-5.5;
    // rssi -117 is > -120 and snr -17 > -23 ⇒ Fair.
    expect(rateSignalQuality(-17, p, -117)).toBe("fair");
    // None: rssi < -126 && snr < limit-7.5
    expect(rateSignalQuality(-26, p, -128)).toBe("none");
    // Bad: rssi <= -120
    expect(rateSignalQuality(-10, p, -125)).toBe("bad");
    // Bad: snr <= limit-5.5 despite strong rssi
    expect(rateSignalQuality(-23.5, p, -90)).toBe("bad");
    // Fair: everything between the bands
    expect(rateSignalQuality(-19, p, -110)).toBe("fair");
  });
});

describe("rateSignalQuality — noise-floor dual margin", () => {
  const p = preset("LONG_FAST"); // limit = -17.5

  it("takes the more conservative tier of the two margins", () => {
    // SNR margin says GOOD (snr -10 vs -17.5), link margin says BAD:
    // rssi -104 with noiseFloor -80 ⇒ linkMargin = (-104 + 80) + 17.5 = -6.5 → bad.
    expect(rateSignalQuality(-10, p, -104, -80)).toBe("bad");
    // Reverse: SNR margin FAIR-ish but link margin strong ⇒ conservative wins.
    // snr -18.5 (margin -1 → good? margin=-1 > -5.5 ⇒ fair... compute: -18.5+17.5=-1 → fair)
    // link: rssi -50, nf -100 ⇒ (-50 + 100) - (-17.5) = 67.5 → good ⇒ conservative = fair.
    expect(rateSignalQuality(-18.5, p, -50, -100)).toBe("fair");
  });

  it("ignores non-positive or missing noise floors", () => {
    // noiseFloor 0/undefined ⇒ fallback blend path.
    expect(rateSignalQuality(-10, p, -95, 0)).toBe("good");
    expect(rateSignalQuality(-10, p, -95, undefined)).toBe("good");
    expect(rateSignalQuality(-10, p, undefined, -80)).toBe("good");
  });
});

describe("quality ordering", () => {
  it("exposes exactly four tiers", () => {
    const all: SignalQuality[] = ["none", "bad", "fair", "good"];
    expect(new Set(all).size).toBe(4);
  });
});

describe("getSignalColor mapping", () => {
  const p = preset("LONG_FAST");

  it("maps tiers to line colors, none renders as BAD", () => {
    expect(getSignalColor(-10, undefined, p)).toBe(LINE_COLOR.GOOD);
    expect(getSignalColor(-19, undefined, p)).toBe(LINE_COLOR.FAIR);
    expect(getSignalColor(-24, undefined, p)).toBe(LINE_COLOR.BAD);
    expect(getSignalColor(-40, undefined, p)).toBe(LINE_COLOR.BAD); // none → BAD
  });
});
