import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import { unreadExcludingMuted } from "./railUnread.ts";

const channel = (index: number, muted: boolean) => ({
  index,
  settings: create(Protobuf.Channel.ChannelSettingsSchema, {
    moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
      isMuted: muted,
    }),
  }),
});

describe("unreadExcludingMuted", () => {
  it("sums unread counts, leaving out muted channels", () => {
    const byKey = new Map([
      ["channel:0", 3],
      ["channel:1", 5],
      ["direct:42", 2],
    ]);
    expect(
      unreadExcludingMuted(byKey, [channel(0, false), channel(1, true)]),
    ).toBe(5);
    expect(unreadExcludingMuted(byKey, [])).toBe(10);
  });

  it("counts a muted peer's DMs (mute is per channel)", () => {
    expect(
      unreadExcludingMuted(new Map([["direct:1", 4]]), [channel(0, true)]),
    ).toBe(4);
  });

  it("still counts mentions of me in a muted channel, unless the sender is muted", () => {
    const byKey = new Map([
      ["channel:1", 5],
      ["channel:0", 1],
    ]);
    const mentions = new Map([["channel:1", [7, 8, 7]]]);
    const channels = [channel(0, false), channel(1, true)];
    expect(unreadExcludingMuted(byKey, channels, mentions)).toBe(4);
    expect(unreadExcludingMuted(byKey, channels, mentions, new Set([7]))).toBe(
      2,
    );
  });
});
