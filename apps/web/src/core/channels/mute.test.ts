import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import { isChannelMuted } from "./mute.ts";

describe("isChannelMuted", () => {
  it("reads the module settings flag", () => {
    const muted = create(Protobuf.Channel.ChannelSchema, {
      settings: create(Protobuf.Channel.ChannelSettingsSchema, {
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          isMuted: true,
        }),
      }),
    });
    expect(isChannelMuted(muted)).toBe(true);
  });

  it("is false without settings or module settings", () => {
    expect(isChannelMuted(undefined)).toBe(false);
    expect(isChannelMuted({})).toBe(false);
    expect(
      isChannelMuted(create(Protobuf.Channel.ChannelSchema, { index: 1 })),
    ).toBe(false);
  });
});
