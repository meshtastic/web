import { create, fromBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";

/**
 * Per-section regression coverage for the four config categories the editor
 * tracks independently — radio config (LoRa), device config (`device`,
 * `bluetooth`, … — the same radio-section mechanism), module config and
 * channels.
 *
 * Every assertion decodes the constructed AdminMessage from its wire bytes,
 * because protobuf omits fields at their default: a boolean that was never
 * really set is simply absent from the encoding, which is exactly how a
 * "successful" save can leave the radio unchanged.
 */

interface Harness {
  client: MeshClient;
  editor: MeshClient["config"]["editor"];
  sent: Protobuf.Admin.AdminMessage[];
  gateOn(value: Protobuf.Admin.AdminMessage["payloadVariant"]["case"]): void;
  release(): void;
}

function createHarness(): Harness {
  const { transport } = createFakeTransport();
  const client = new MeshClient({ transport });
  const sent: Protobuf.Admin.AdminMessage[] = [];
  let release: (() => void) | undefined;
  let gate: Protobuf.Admin.AdminMessage["payloadVariant"]["case"] | undefined;

  client.sendPacket = (async (payload: Uint8Array) => {
    const admin = fromBinary(Protobuf.Admin.AdminMessageSchema, payload);
    sent.push(admin);
    if (gate && admin.payloadVariant.case === gate) {
      gate = undefined;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    }
    return 1;
  }) as never;

  return {
    client,
    editor: client.config.editor,
    sent,
    gateOn: (value) => {
      gate = value;
    },
    release: () => release?.(),
  };
}

function summarise(sent: Protobuf.Admin.AdminMessage[]): string[] {
  return sent.map((admin) => {
    const variant = admin.payloadVariant;
    switch (variant.case) {
      case "setConfig":
        return `setConfig:${variant.value.payloadVariant.case}`;
      case "setModuleConfig":
        return `setModuleConfig:${variant.value.payloadVariant.case}`;
      default:
        return String(variant.case);
    }
  });
}

function channelFromWire(
  sent: Protobuf.Admin.AdminMessage[],
): Protobuf.Channel.Channel | undefined {
  for (const admin of sent) {
    if (admin.payloadVariant.case === "setChannel") {
      return admin.payloadVariant.value;
    }
  }
  return undefined;
}

/**
 * Pull a config section back out of the transmitted AdminMessages. The value
 * is cast to the caller's section type: the wire union cannot be narrowed
 * generically, and the `case` check above already guarantees it.
 */
function radioFromWire<T>(
  sent: Protobuf.Admin.AdminMessage[],
  section: Protobuf.Config.Config["payloadVariant"]["case"],
): T | undefined {
  for (const admin of sent) {
    if (admin.payloadVariant.case !== "setConfig") continue;
    const variant = admin.payloadVariant.value.payloadVariant;
    if (variant.case === section) {
      return variant.value as T;
    }
  }
  return undefined;
}

function primaryChannel(
  init: Partial<{
    uplinkEnabled: boolean;
    downlinkEnabled: boolean;
    isMuted: boolean;
    channelNum: number;
  }> = {},
): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index: 0,
    role: Protobuf.Channel.Channel_Role.PRIMARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, {
      channelNum: init.channelNum ?? 0,
      psk: new Uint8Array([1]),
      name: "",
      id: 4242,
      uplinkEnabled: init.uplinkEnabled ?? false,
      downlinkEnabled: init.downlinkEnabled ?? false,
      moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
        positionPrecision: 13,
        isMuted: init.isMuted ?? false,
      }),
    }),
  });
}

/** What a channel form stages: a freshly built message, uplink flipped on. */
function stagedChannel(uplinkEnabled: boolean): Protobuf.Channel.Channel {
  const next = primaryChannel();
  return create(Protobuf.Channel.ChannelSchema, {
    ...next,
    settings: { ...next.settings, uplinkEnabled },
  });
}

function devicePacket(
  init: Partial<{
    role: number;
    buttonGpio: number;
    doubleTapAsButtonPress: boolean;
  }>,
): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "device",
      value: create(Protobuf.Config.Config_DeviceConfigSchema, init as never),
    },
  });
}

function mqttPacket(
  init: Partial<{ enabled: boolean; address: string }>,
): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: "mqtt",
      value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, init),
    },
  });
}

describe("ConfigEditor — channels", () => {
  it("transmits the uplinkEnabled flag the channel form staged", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onChannelPacket.dispatch(primaryChannel());

    editor.setChannel(stagedChannel(true));
    expect(editor.dirtyChannels.value).toEqual([0]);

    expect((await editor.commit()).status).toBe("ok");

    // `uplink_enabled` is field 5; `false` is not encoded at all, so reading
    // it back off the wire is the only proof it was genuinely set.
    expect(channelFromWire(sent)?.settings?.uplinkEnabled).toBe(true);
    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setChannel",
      "commitEditSettings",
    ]);
    expect(editor.dirtyChannels.value).toEqual([]);
    expect(editor.isDirty.value).toBe(false);
  });

  it("keeps a channel edit staged during an in-flight commit pending", async () => {
    const harness = createHarness();
    const { client, editor, sent } = harness;

    client.events.onChannelPacket.dispatch(primaryChannel());
    client.events.onModuleConfigPacket.dispatch(mqttPacket({ enabled: false }));

    // An unrelated module save is in flight...
    editor.setModuleSection("mqtt", {
      enabled: true,
      address: "mqtt.example.org",
    } as never);
    harness.gateOn("commitEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // ...and the user flips the channel's uplink flag while it round-trips.
    editor.setChannel(stagedChannel(true));
    expect(editor.dirtyChannels.value).toEqual([0]);

    harness.release();
    expect((await pending).status).toBe("ok");

    // The channel was never part of that transaction, so it must stay dirty
    // instead of being laundered as "saved".
    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setModuleConfig:mqtt",
      "commitEditSettings",
    ]);
    expect(channelFromWire(sent)).toBeUndefined();
    expect(editor.dirtyChannels.value).toEqual([0]);
    expect(editor.isDirty.value).toBe(true);

    // And it goes out on the next commit with the flag intact.
    expect((await editor.commit()).status).toBe("ok");
    expect(channelFromWire(sent)?.settings?.uplinkEnabled).toBe(true);
    expect(editor.dirtyChannels.value).toEqual([]);
  });

  it("committing a channel leaves an unrelated staged section dirty", async () => {
    const harness = createHarness();
    const { client, editor, sent } = harness;

    client.events.onChannelPacket.dispatch(primaryChannel());
    client.events.onConfigPacket.dispatch(devicePacket({ buttonGpio: 4 }));

    editor.setChannel(stagedChannel(true));
    harness.gateOn("beginEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Staged after the payload was frozen — not part of this transaction.
    editor.setRadioSection("device", { buttonGpio: 7 } as never);

    harness.release();
    expect((await pending).status).toBe("ok");

    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setChannel",
      "commitEditSettings",
    ]);
    expect(editor.dirtyChannels.value).toEqual([]);
    expect(editor.dirtyRadioSections.value).toEqual(["device"]);
  });

  it("does not clear a staged channel when another section commits", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onChannelPacket.dispatch(primaryChannel());
    client.events.onModuleConfigPacket.dispatch(mqttPacket({ enabled: true }));

    editor.setChannel(stagedChannel(true));
    // A channel that cannot be transmitted (no working value) must not be
    // marked synced by an unrelated successful commit either.
    editor.setModuleSection("mqtt", undefined as never);

    expect((await editor.commit()).status).toBe("ok");

    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setChannel",
      "commitEditSettings",
    ]);
    expect(editor.dirtyChannels.value).toEqual([]);
    expect(editor.dirtyModuleSections.value).toEqual(["mqtt"]);
  });

  it("preserves the channel sub-message the staged value omits", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onChannelPacket.dispatch(
      primaryChannel({ isMuted: true, channelNum: 20 }),
    );

    // A `create()`d message materialises every singular scalar, so only the
    // absent sub-message can be recovered — and it must be, or saving the
    // uplink toggle would silently drop the channel's mute flag and location
    // precision.
    editor.setChannel(
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Protobuf.Channel.Channel_Role.PRIMARY,
        settings: {
          channelNum: 20,
          psk: new Uint8Array([1]),
          id: 4242,
          uplinkEnabled: true,
        },
      }),
    );

    expect((await editor.commit()).status).toBe("ok");

    const wire = channelFromWire(sent);
    expect(wire?.settings?.uplinkEnabled).toBe(true);
    expect(wire?.settings?.channelNum).toBe(20);
    expect(wire?.settings?.id).toBe(4242);
    expect(wire?.settings?.moduleSettings?.positionPrecision).toBe(13);
    expect(wire?.settings?.moduleSettings?.isMuted).toBe(true);
  });

  it("preserves channel fields a partial staged object omits", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onChannelPacket.dispatch(
      primaryChannel({ isMuted: true, channelNum: 20 }),
    );

    // A resolver output that only carries the fields its form declares.
    editor.setChannel({
      index: 0,
      role: Protobuf.Channel.Channel_Role.PRIMARY,
      settings: { uplinkEnabled: true },
    } as never);

    expect((await editor.commit()).status).toBe("ok");

    const wire = channelFromWire(sent);
    expect(wire?.settings?.uplinkEnabled).toBe(true);
    expect(wire?.settings?.channelNum).toBe(20);
    expect(wire?.settings?.id).toBe(4242);
    expect(wire?.settings?.psk).toEqual(new Uint8Array([1]));
    expect(wire?.settings?.moduleSettings?.isMuted).toBe(true);
  });
});

describe("ConfigEditor — device config", () => {
  it("transmits the device-config value the form staged", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onConfigPacket.dispatch(
      devicePacket({ buttonGpio: 4, doubleTapAsButtonPress: false }),
    );

    editor.setRadioSection("device", {
      buttonGpio: 4,
      doubleTapAsButtonPress: true,
    } as never);
    expect(editor.dirtyRadioSections.value).toEqual(["device"]);

    expect((await editor.commit()).status).toBe("ok");

    const wire = radioFromWire<Protobuf.Config.Config_DeviceConfig>(
      sent,
      "device",
    );
    expect(wire?.doubleTapAsButtonPress).toBe(true);
    expect(wire?.buttonGpio).toBe(4);
    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setConfig:device",
      "commitEditSettings",
    ]);
    expect(editor.dirtyRadioSections.value).toEqual([]);
  });

  it("keeps a device edit staged during an in-flight commit pending", async () => {
    const harness = createHarness();
    const { client, editor, sent } = harness;

    client.events.onConfigPacket.dispatch(devicePacket({ buttonGpio: 4 }));
    client.events.onChannelPacket.dispatch(primaryChannel());

    editor.setChannel(stagedChannel(true));
    harness.gateOn("commitEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    editor.setRadioSection("device", {
      buttonGpio: 4,
      doubleTapAsButtonPress: true,
    } as never);

    harness.release();
    expect((await pending).status).toBe("ok");

    expect(
      radioFromWire<Protobuf.Config.Config_DeviceConfig>(sent, "device"),
    ).toBeUndefined();
    expect(editor.dirtyRadioSections.value).toEqual(["device"]);
    expect(editor.isDirty.value).toBe(true);

    expect((await editor.commit()).status).toBe("ok");
    expect(
      radioFromWire<Protobuf.Config.Config_DeviceConfig>(sent, "device")
        ?.doubleTapAsButtonPress,
    ).toBe(true);
    expect(editor.dirtyRadioSections.value).toEqual([]);
  });

  it("committing device config leaves a staged channel dirty", async () => {
    const harness = createHarness();
    const { client, editor, sent } = harness;

    client.events.onConfigPacket.dispatch(devicePacket({ buttonGpio: 4 }));
    client.events.onChannelPacket.dispatch(primaryChannel());

    editor.setRadioSection("device", {
      buttonGpio: 4,
      doubleTapAsButtonPress: true,
    } as never);
    harness.gateOn("beginEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    editor.setChannel(stagedChannel(true));

    harness.release();
    expect((await pending).status).toBe("ok");

    expect(summarise(sent)).toEqual([
      "beginEditSettings",
      "setConfig:device",
      "commitEditSettings",
    ]);
    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.dirtyChannels.value).toEqual([0]);
  });

  it("preserves device-config fields the form does not declare", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onConfigPacket.dispatch(
      devicePacket({ role: 2, buttonGpio: 4 }),
    );

    // Zod strips undeclared keys, so a form that never rendered `buttonGpio`
    // used to reset it to 0 on the device on every save.
    editor.setRadioSection("device", {
      role: 2,
      doubleTapAsButtonPress: true,
    } as never);

    expect((await editor.commit()).status).toBe("ok");

    const wire = radioFromWire<Protobuf.Config.Config_DeviceConfig>(
      sent,
      "device",
    );
    expect(wire?.doubleTapAsButtonPress).toBe(true);
    expect(wire?.buttonGpio).toBe(4);
    expect(wire?.role).toBe(2);
  });

  it("does not flag a section dirty over a field the form omits", () => {
    const { client, editor } = createHarness();
    client.events.onConfigPacket.dispatch(
      devicePacket({ role: 2, buttonGpio: 4 }),
    );

    // Re-saving without changing anything: the omitted `buttonGpio` must not
    // read as a change, or the section stays "unsaved" forever.
    editor.setRadioSection("device", { role: 2 } as never);

    expect(editor.dirtyRadioSections.value).toEqual([]);
    expect(editor.isDirty.value).toBe(false);
  });
});

describe("ConfigEditor — module config", () => {
  it("preserves module fields the form does not declare", async () => {
    const { client, editor, sent } = createHarness();
    client.events.onModuleConfigPacket.dispatch(
      mqttPacket({ enabled: false, address: "mqtt.example.org" }),
    );

    editor.setModuleSection("mqtt", { enabled: true } as never);

    expect((await editor.commit()).status).toBe("ok");

    for (const admin of sent) {
      if (admin.payloadVariant.case !== "setModuleConfig") continue;
      const variant = admin.payloadVariant.value.payloadVariant;
      if (variant.case !== "mqtt") continue;
      expect(variant.value.enabled).toBe(true);
      expect(variant.value.address).toBe("mqtt.example.org");
    }
  });
});
