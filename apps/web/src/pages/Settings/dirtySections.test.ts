import { describe, expect, it } from "vitest";
import { dirtyDeviceTabs, dirtyModuleTabs } from "./dirtySections.ts";

describe("dirtyModuleTabs", () => {
  it("counts staged canned messages and ringtone under their modules", () => {
    const dirty = dirtyModuleTabs(["mqtt"], ["cannedMessages", "ringtone"]);
    expect([...dirty].sort()).toEqual([
      "cannedMessage",
      "externalNotification",
      "mqtt",
    ]);
  });

  it("leaves the status message to the User page", () => {
    expect(dirtyModuleTabs(["statusmessage"], []).size).toBe(0);
  });

  it("counts a module once when both its section and a message are staged", () => {
    expect(dirtyModuleTabs(["cannedMessage"], ["cannedMessages"]).size).toBe(1);
  });
});

describe("dirtyDeviceTabs", () => {
  it("keeps only device configuration sections", () => {
    const dirty = dirtyDeviceTabs(["lora", "power", "security"], []);
    expect([...dirty]).toEqual(["power"]);
  });

  it("counts a staged fixed position under Position", () => {
    expect([...dirtyDeviceTabs([], ["fixedPosition"])]).toEqual(["position"]);
    expect([...dirtyDeviceTabs([], ["profileFixedPosition"])]).toEqual([
      "position",
    ]);
  });
});
