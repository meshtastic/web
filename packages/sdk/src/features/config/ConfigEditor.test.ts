import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { DeviceStatusEnum } from "../../core/transport/Transport.ts";

function loraPacket(region: number): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "lora",
      value: create(Protobuf.Config.Config_LoRaConfigSchema, { region }),
    },
  });
}

function mqttPacket(enabled: boolean): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: "mqtt",
      value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, { enabled }),
    },
  });
}

function channelPacket(index: number, name: string): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index,
    role: Protobuf.Channel.Channel_Role.SECONDARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, { name }),
  });
}

describe("ConfigEditor", () => {
  it("starts clean and tracks dirty when working diverges from baseline", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    expect(editor.isDirty.value).toBe(false);

    client.events.onConfigPacket.dispatch(loraPacket(4));
    expect(editor.isDirty.value).toBe(false);
    expect(editor.radio.value.lora?.region).toBe(4);

    editor.setRadioSection("lora", create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }));
    expect(editor.isDirty.value).toBe(true);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("tracks module + channel dirtiness independently", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onModuleConfigPacket.dispatch(mqttPacket(false));
    client.events.onChannelPacket.dispatch(channelPacket(1, "primary"));

    editor.setModuleSection(
      "mqtt",
      create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, { enabled: true }),
    );
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);

    editor.setChannel(channelPacket(1, "renamed"));
    expect(editor.dirtyChannels.value).toEqual([1]);
    expect(editor.isDirty.value).toBe(true);
  });

  it("reset() restores working = baseline and clears dirty flags", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onConfigPacket.dispatch(loraPacket(4));
    editor.setRadioSection("lora", create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }));
    expect(editor.isDirty.value).toBe(true);

    editor.reset();
    expect(editor.isDirty.value).toBe(false);
    expect(editor.radio.value.lora?.region).toBe(4);
  });

  it("inbound baseline updates do not stomp pending working edits", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    // User edits lora region
    client.events.onConfigPacket.dispatch(loraPacket(4));
    editor.setRadioSection("lora", create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }));

    // Device pushes a baseline change for the same section while user is editing
    client.events.onConfigPacket.dispatch(loraPacket(8));

    // Working edit preserved; dirty still set
    expect(editor.radio.value.lora?.region).toBe(7);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("disconnect drops baseline and working", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onConfigPacket.dispatch(loraPacket(4));
    editor.setRadioSection("lora", create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }));
    expect(editor.isDirty.value).toBe(true);

    client.events.onDeviceStatus.dispatch(DeviceStatusEnum.DeviceDisconnected);

    expect(editor.radio.value).toEqual({});
    expect(editor.isDirty.value).toBe(false);
  });
});
