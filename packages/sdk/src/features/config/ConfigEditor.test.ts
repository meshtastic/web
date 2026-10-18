import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { interceptAdminMessages } from "../../core/testing/interceptAdminMessages.ts";
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
});

const LORA = "lora" as const;

/** A connected editor with lora edited from region 1 to 4. */
function setupCommit() {
  const { transport } = createFakeTransport();
  const client = new MeshClient({ transport });
  const editor = client.config.editor;
  const radio = interceptAdminMessages(client);

  client.events.onConfigPacket.dispatch(loraPacket(1));
  client.events.onModuleConfigPacket.dispatch(mqttPacket(false));
  client.events.onChannelPacket.dispatch(channelPacket(1, "primary"));
  editor.setRadioSection(
    LORA,
    create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
  );
  return { client, editor, radio };
}

const enableMqtt = () =>
  create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
    enabled: true,
  });

const user = (longName: string) =>
  create(Protobuf.Mesh.UserSchema, { id: "!00000001", longName });

describe("ConfigEditor.commit", () => {
  it("keeps an edit made while a commit is in flight dirty", async () => {
    const { editor, radio } = setupCommit();
    const held = radio.hold("commitEditSettings");

    const pending = editor.commit();
    await held.reached;
    editor.setModuleSection("mqtt", enableMqtt());
    held.release();
    expect((await pending).status).toBe("ok");

    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
    expect(radio.sentModuleConfig("mqtt")).toBeUndefined();

    expect((await editor.commit()).status).toBe("ok");
    expect(radio.sentModuleConfig("mqtt")?.enabled).toBe(true);
    expect(editor.isDirty.value).toBe(false);
  });

  it("keeps device packets for unsent sections that arrive during a commit", async () => {
    const { client, editor, radio } = setupCommit();
    const held = radio.hold("commitEditSettings");

    const pending = editor.commit();
    await held.reached;
    client.events.onModuleConfigPacket.dispatch(mqttPacket(true));
    client.events.onChannelPacket.dispatch(channelPacket(1, "renamed"));
    held.release();
    expect((await pending).status).toBe("ok");

    expect(editor.isDirty.value).toBe(false);
    expect(editor.modules.value.mqtt?.enabled).toBe(true);
    expect(editor.channels.value.get(1)?.settings?.name).toBe("renamed");
  });

  it("keeps an owner update that arrives during a commit", async () => {
    const { editor, radio } = setupCommit();
    editor.setBaselineOwner(user("Before"));
    const held = radio.hold("commitEditSettings");

    const pending = editor.commit();
    await held.reached;
    editor.setBaselineOwner(user("After"));
    held.release();
    expect((await pending).status).toBe("ok");

    expect(editor.isOwnerDirty.value).toBe(false);
    expect(editor.owner.value?.longName).toBe("After");
    expect(radio.cases()).not.toContain("setOwner");
  });

  it("leaves the editor empty when the device disconnects during a commit", async () => {
    const { client, editor, radio } = setupCommit();
    const held = radio.hold("commitEditSettings");

    const pending = editor.commit();
    await held.reached;
    client.events.onDeviceStatus.dispatch(DeviceStatusEnum.DeviceDisconnected);
    held.release();
    expect((await pending).status).toBe("error");

    expect(editor.radio.value).toEqual({});
    expect(editor.isDirty.value).toBe(false);
    client.events.onConfigPacket.dispatch(loraPacket(1));
    expect(editor.isDirty.value).toBe(false);
  });

  it("sends a message queued again during a commit", async () => {
    const { editor, radio } = setupCommit();
    const message = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: { case: "removeFixedPosition", value: true },
    });
    editor.queueAdminMessage(message);
    const held = radio.hold("commitEditSettings");

    const pending = editor.commit();
    await held.reached;
    editor.queueAdminMessage(message);
    held.release();
    expect((await pending).status).toBe("ok");
    expect(editor.isDirty.value).toBe(true);

    expect((await editor.commit()).status).toBe("ok");
    expect(
      radio.cases().filter((c) => c === "removeFixedPosition"),
    ).toHaveLength(2);
    expect(editor.isDirty.value).toBe(false);
  });

  it("runs a commit requested during another after it finishes", async () => {
    const { editor, radio } = setupCommit();
    const held = radio.hold("commitEditSettings");

    const first = editor.commit();
    await held.reached;
    editor.setModuleSection("mqtt", enableMqtt());
    const second = editor.commit();
    held.release();

    expect((await first).status).toBe("ok");
    expect((await second).status).toBe("ok");
    expect(radio.cases()).toEqual([
      "beginEditSettings",
      "setConfig",
      "commitEditSettings",
      "beginEditSettings",
      "setModuleConfig",
      "commitEditSettings",
    ]);
    expect(editor.isDirty.value).toBe(false);
  });

  it("closes the transaction and stays dirty when a send fails", async () => {
    const { editor, radio } = setupCommit();
    editor.setModuleSection("mqtt", enableMqtt());
    radio.failNext("setModuleConfig");

    expect((await editor.commit()).status).toBe("error");

    expect(radio.cases()).toEqual([
      "beginEditSettings",
      "setConfig",
      "setModuleConfig",
      "commitEditSettings",
    ]);
    expect(editor.dirtyRadioSections.value).toEqual([LORA]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
  });
});
