import { create, fromBinary } from "@bufbuild/protobuf";
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
      value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled,
      }),
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

    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }),
    );
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
      create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled: true,
      }),
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
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }),
    );
    expect(editor.isDirty.value).toBe(true);

    editor.reset();
    expect(editor.isDirty.value).toBe(false);
    expect(editor.radio.value.lora?.region).toBe(4);
  });

  it("reset() drops queued admin messages", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    editor.queueAdminMessage(
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: {
          case: "setFixedPosition",
          value: create(Protobuf.Mesh.PositionSchema, { latitudeI: 1 }),
        },
      }),
    );
    expect(editor.isDirty.value).toBe(true);

    editor.reset();
    expect(editor.isDirty.value).toBe(false);
  });

  it("inbound baseline updates do not stomp pending working edits", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    // User edits lora region
    client.events.onConfigPacket.dispatch(loraPacket(4));
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }),
    );

    // Device pushes a baseline change for the same section while user is editing
    client.events.onConfigPacket.dispatch(loraPacket(8));

    // Working edit preserved; dirty still set
    expect(editor.radio.value.lora?.region).toBe(7);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("keeps radio fields a partial update leaves out", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, {
            region: 4,
            paFanDisabled: true,
            ignoreIncoming: [1234],
          }),
        },
      }),
    );

    // Form data after zod validation: only the fields the form renders.
    editor.setRadioSection("lora", {
      region: 7,
    } as unknown as Protobuf.Config.Config_LoRaConfig);

    const lora = editor.radio.value.lora;
    expect(lora?.region).toBe(7);
    expect(lora?.paFanDisabled).toBe(true);
    expect(lora?.ignoreIncoming).toEqual([1234]);
    expect(editor.dirtyRadioSections.value).toEqual(["lora"]);
  });

  it("keeps module fields a partial update leaves out", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onModuleConfigPacket.dispatch(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "rangeTest",
          value: create(
            Protobuf.ModuleConfig.ModuleConfig_RangeTestConfigSchema,
            { enabled: false, clearOnReboot: true },
          ),
        },
      }),
    );

    editor.setModuleSection("rangeTest", {
      enabled: true,
    } as unknown as Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig);

    expect(editor.modules.value.rangeTest?.enabled).toBe(true);
    expect(editor.modules.value.rangeTest?.clearOnReboot).toBe(true);
  });

  it("a partial update equal to the baseline is not dirty", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onConfigPacket.dispatch(loraPacket(4));
    editor.setRadioSection("lora", {
      region: 4,
    } as unknown as Protobuf.Config.Config_LoRaConfig);

    expect(editor.isDirty.value).toBe(false);
  });

  it("disconnect drops baseline and working", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onConfigPacket.dispatch(loraPacket(4));
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 7 }),
    );
    expect(editor.isDirty.value).toBe(true);

    client.events.onDeviceStatus.dispatch(DeviceStatusEnum.DeviceDisconnected);

    expect(editor.radio.value).toEqual({});
    expect(editor.isDirty.value).toBe(false);
  });

  it("keeps an edit made while a commit is in flight dirty", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const editor = client.config.editor;

    client.events.onConfigPacket.dispatch(loraPacket(1));
    client.events.onModuleConfigPacket.dispatch(mqttPacket(false));
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
    );

    // Hold the first commitEditSettings open so the commit is in flight.
    const sent: Protobuf.Admin.AdminMessage[] = [];
    let release: (() => void) | undefined;
    let held = false;
    client.sendPacket = (async (payload: Uint8Array) => {
      const admin = fromBinary(Protobuf.Admin.AdminMessageSchema, payload);
      sent.push(admin);
      if (!held && admin.payloadVariant.case === "commitEditSettings") {
        held = true;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return 1;
    }) as never;

    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    editor.setModuleSection(
      "mqtt",
      create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled: true,
      }),
    );
    release?.();
    expect((await pending).status).toBe("ok");

    // The lora edit was sent and is clean; the mqtt edit was not and is not.
    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
    expect(editor.isDirty.value).toBe(true);
    expect(sent.map((a) => a.payloadVariant.case)).not.toContain(
      "setModuleConfig",
    );

    // The next commit carries it.
    expect((await editor.commit()).status).toBe("ok");
    expect(sent.map((a) => a.payloadVariant.case)).toContain("setModuleConfig");
    expect(editor.isDirty.value).toBe(false);
  });
});
