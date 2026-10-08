import { create, fromBinary } from "@bufbuild/protobuf";
import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { MeshClient, MeshRegistry, Protobuf } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { MeshRegistryProvider } from "@meshtastic/sdk-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { Channel } from "./Channel.tsx";

/**
 * End-to-end cover for the channel save path: the real channel form ->
 * `ConfigEditor` staging -> the AdminMessage bytes that go to the radio.
 *
 * `ChannelSettings.uplink_enabled` is field 5 and `downlink_enabled` is field
 * 6 of a proto3 message, so `false` is simply *absent* from the encoding. The
 * assertions therefore decode the outgoing packet from its wire bytes: if the
 * toggle never really reached the payload, the field is missing on the device
 * exactly as it was in the live regression this covers.
 */

let deviceIdSeq = 500;

const PRIMARY_PSK = new Uint8Array([1]);

function primaryChannel(
  init: Partial<{
    uplinkEnabled: boolean;
    downlinkEnabled: boolean;
    channelNum: number;
    isMuted: boolean;
  }> = {},
): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index: 0,
    role: Protobuf.Channel.Channel_Role.PRIMARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, {
      channelNum: init.channelNum ?? 0,
      psk: PRIMARY_PSK,
      name: "",
      id: 1234,
      uplinkEnabled: init.uplinkEnabled ?? false,
      downlinkEnabled: init.downlinkEnabled ?? false,
      moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
        positionPrecision: 10,
        isMuted: init.isMuted ?? false,
      }),
    }),
  });
}

function setup(channel: Protobuf.Channel.Channel) {
  const { transport } = createFakeTransport();
  const registry = new MeshRegistry();
  const client = new MeshClient({ transport });
  const connectionId = deviceIdSeq++;
  registry.register(connectionId, client);
  registry.setActive(connectionId);

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

  const device = useDeviceStore.getState().addDevice(connectionId);
  device.addChannel(channel);
  client.events.onChannelPacket.dispatch(channel);

  render(
    <CurrentDeviceContext.Provider value={{ deviceId: connectionId }}>
      <MeshRegistryProvider registry={registry}>
        <Suspense fallback={<div>loading</div>}>
          <Channel onFormInit={() => {}} channel={channel} />
        </Suspense>
      </MeshRegistryProvider>
    </CurrentDeviceContext.Provider>,
  );

  return {
    client,
    editor: client.config.editor,
    sent,
    gateOn: (
      value: Protobuf.Admin.AdminMessage["payloadVariant"]["case"],
    ): void => {
      gate = value;
    },
    release: () => release?.(),
  };
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

describe("Channel settings", () => {
  it("puts `uplinkEnabled: true` on the wire when the toggle is switched on", async () => {
    const { editor, sent } = setup(primaryChannel());

    await userEvent.click(await screen.findByLabelText("Uplink Enabled"));

    await waitFor(() => expect(editor.dirtyChannels.value).toContain(0));
    expect((await editor.commit()).status).toBe("ok");

    const wire = channelFromWire(sent);
    expect(wire).toBeDefined();
    expect(wire?.settings?.uplinkEnabled).toBe(true);
    // Untouched fields must still round-trip.
    expect(wire?.index).toBe(0);
    expect(wire?.role).toBe(Protobuf.Channel.Channel_Role.PRIMARY);
    expect(wire?.settings?.id).toBe(1234);
    expect(wire?.settings?.psk).toEqual(PRIMARY_PSK);
    expect(wire?.settings?.downlinkEnabled).toBe(false);
    expect(wire?.settings?.moduleSettings?.positionPrecision).toBe(10);
  });

  it("puts `downlinkEnabled: true` on the wire when the toggle is switched on", async () => {
    const { editor, sent } = setup(primaryChannel());

    await userEvent.click(await screen.findByLabelText("Downlink Enabled"));

    await waitFor(() => expect(editor.dirtyChannels.value).toContain(0));
    expect((await editor.commit()).status).toBe("ok");

    expect(channelFromWire(sent)?.settings?.downlinkEnabled).toBe(true);
  });

  it("does not report the toggle as saved when it was not part of the commit", async () => {
    const { client, editor, sent, gateOn, release } = setup(primaryChannel());

    client.events.onConfigPacket.dispatch(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, { region: 1 }),
        },
      }),
    );
    editor.setRadioSection(
      "lora",
      create(Protobuf.Config.Config_LoRaConfigSchema, { region: 4 }),
    );

    // Start an unrelated save and hold it open on the closing commitEditSettings.
    gateOn("commitEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The user flips "Uplink Enabled" while that save is still in flight.
    await userEvent.click(await screen.findByLabelText("Uplink Enabled"));
    await waitFor(() => expect(editor.dirtyChannels.value).toContain(0));

    release();
    expect((await pending).status).toBe("ok");

    // The transaction really did open and commit on the device, but it never
    // carried the channel payload — so the edit has to stay pending.
    expect(sent.map((a) => a.payloadVariant.case)).toEqual([
      "beginEditSettings",
      "setConfig",
      "commitEditSettings",
    ]);
    expect(channelFromWire(sent)).toBeUndefined();
    expect(editor.dirtyChannels.value).toContain(0);
    expect(editor.isDirty.value).toBe(true);

    // The next save carries it, with `uplinkEnabled` intact.
    expect((await editor.commit()).status).toBe("ok");
    expect(channelFromWire(sent)?.settings?.uplinkEnabled).toBe(true);
    expect(editor.isDirty.value).toBe(false);
  });
  it("saves a channel carrying the deprecated channel_num slot", async () => {
    // `ChannelSettings.channel_num` is a deprecated uint32 the form does not
    // render. A schema that capped it at 7 made every such channel silently
    // unsavable: the toggle moved, nothing was staged, and the following save
    // opened a real transaction without the change in it.
    const { editor, sent } = setup(primaryChannel({ channelNum: 20 }));

    await userEvent.click(await screen.findByLabelText("Uplink Enabled"));

    await waitFor(() => expect(editor.dirtyChannels.value).toContain(0));
    expect((await editor.commit()).status).toBe("ok");

    const wire = channelFromWire(sent);
    expect(wire?.settings?.uplinkEnabled).toBe(true);
    expect(wire?.settings?.channelNum).toBe(20);
  });

  it("keeps the channel's mute flag when another setting is saved", async () => {
    const { editor, sent } = setup(primaryChannel({ isMuted: true }));

    await userEvent.click(await screen.findByLabelText("Uplink Enabled"));

    await waitFor(() => expect(editor.dirtyChannels.value).toContain(0));
    expect((await editor.commit()).status).toBe("ok");

    const wire = channelFromWire(sent);
    expect(wire?.settings?.uplinkEnabled).toBe(true);
    // `is_muted` is not rendered by this form; the resolver used to drop it,
    // which reset it on the device on every channel save.
    expect(wire?.settings?.moduleSettings?.isMuted).toBe(true);
  });

  it("saves a channel whose settings sub-message is absent", async () => {
    const { editor, sent } = setup(
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Protobuf.Channel.Channel_Role.PRIMARY,
      }),
    );

    await userEvent.click(await screen.findByLabelText("Uplink Enabled"));

    await waitFor(() => expect(editor.dirtyChannels.value).toContain(0));
    expect((await editor.commit()).status).toBe("ok");

    expect(channelFromWire(sent)?.settings?.uplinkEnabled).toBe(true);
  });
});
