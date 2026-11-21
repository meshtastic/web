import { describe, expect, it } from "vitest";
import { channelLabel, type ChannelLabelTranslate } from "./channelLabel.ts";

const t: ChannelLabelTranslate = (key, options) =>
  `${key}(${Object.entries(options ?? {})
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(",")})`;

describe("channelLabel", () => {
  it("prefers the trimmed channel name", () => {
    expect(channelLabel({ index: 2, name: " Hiking " }, t)).toBe("Hiking");
  });

  it("falls back to Primary for slot 0", () => {
    expect(channelLabel({ index: 0 }, t)).toBe(
      "page.broadcastLabel(ns=channels)",
    );
    expect(channelLabel({ index: 0, name: "  " }, t)).toBe(
      "page.broadcastLabel(ns=channels)",
    );
  });

  it("falls back to the slot number for the others", () => {
    expect(channelLabel({ index: 4, name: "" }, t)).toBe(
      "page.channelIndex(ns=channels,index=4)",
    );
  });
});
