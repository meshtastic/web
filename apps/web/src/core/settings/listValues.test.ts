import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  presetName,
  regionName,
  roleName,
  settingsListValues,
} from "./listValues.ts";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Role = Protobuf.Config.Config_DeviceConfig_Role;
const ChannelRole = Protobuf.Channel.Channel_Role;

describe("names", () => {
  it("formats presets, regions and roles as the apps show them", () => {
    expect(presetName(Preset.LONG_FAST)).toBe("LongFast");
    expect(presetName(Preset.MEDIUM_SLOW)).toBe("MediumSlow");
    expect(regionName(Region.US)).toBe("US");
    expect(regionName(Region.EU_868)).toBe("EU 868");
    expect(roleName(Role.CLIENT)).toBe("Client");
    expect(roleName(Role.CLIENT_MUTE)).toBe("Client mute");
  });
});

describe("settingsListValues", () => {
  it("summarises user, LoRa, channels, role, firmware and theme", () => {
    expect(
      settingsListValues({
        userName: "EAO1",
        lora: {
          region: Region.US,
          modemPreset: Preset.LONG_FAST,
          usePreset: true,
        },
        channels: [
          { role: ChannelRole.PRIMARY },
          { role: ChannelRole.SECONDARY },
          { role: ChannelRole.DISABLED },
        ],
        role: Role.CLIENT,
        firmware: "2.8.1",
        theme: "Dark",
      }),
    ).toEqual({
      user: "EAO1",
      lora: "US · LongFast",
      channels: "2",
      device: "Client",
      firmware: "2.8.1",
      app: "Dark",
    });
  });

  it("leaves out what isn't known yet", () => {
    expect(
      settingsListValues({
        lora: {
          region: Region.UNSET,
          modemPreset: Preset.LONG_FAST,
          usePreset: true,
        },
        channels: [],
      }),
    ).toEqual({});
  });

  it("shows only the region with custom modem settings", () => {
    expect(
      settingsListValues({
        lora: {
          region: Region.EU_868,
          modemPreset: Preset.LONG_FAST,
          usePreset: false,
        },
      }).lora,
    ).toBe("EU 868");
  });
});
