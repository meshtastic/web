import { create, fromBinary } from "@bufbuild/protobuf";
import { BluetoothValidationSchema } from "@app/validation/config/bluetooth.ts";
import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { MeshClient, MeshRegistry, Protobuf } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { MeshRegistryProvider } from "@meshtastic/sdk-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentType, Suspense } from "react";
import { describe, expect, it } from "vitest";

/**
 * End-to-end cover for the Device settings page. Its tabs (Device, Bluetooth,
 * Display, Power, Network, Position) all stage through the *same* radio-config
 * mechanism as LoRa — `ConfigEditor.setRadioSection` and `_dirtyRadioSections`
 * — so they share both the commit bookkeeping and the "the form silently
 * refuses to save" failure mode.
 *
 * Assertions decode the outgoing AdminMessage from its wire bytes: protobuf
 * omits fields at their default, so a boolean that was never really set is
 * simply missing on the device.
 */

let deviceIdSeq = 800;

function setup(
  Component: ComponentType<{ onFormInit: () => void }>,
  config: Protobuf.Config.Config,
) {
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
  device.setConfig(config);
  client.events.onConfigPacket.dispatch(config);

  render(
    <CurrentDeviceContext.Provider value={{ deviceId: connectionId }}>
      <MeshRegistryProvider registry={registry}>
        <Suspense fallback={<div>loading</div>}>
          <Component onFormInit={() => {}} />
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

/**
 * Pull a config section back out of the transmitted AdminMessages. The value
 * is cast to the caller's section type: the wire union cannot be narrowed
 * generically, and the `case` check above already guarantees it.
 */
function fromWire<T>(
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

const deviceConfig = () =>
  create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "device",
      value: create(Protobuf.Config.Config_DeviceConfigSchema, {
        role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
        buttonGpio: 4,
        buzzerGpio: 2,
        nodeInfoBroadcastSecs: 10800,
        doubleTapAsButtonPress: false,
      }),
    },
  });

const bluetoothConfig = (fixedPin: number) =>
  create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: "bluetooth",
      value: create(Protobuf.Config.Config_BluetoothConfigSchema, {
        enabled: false,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.RANDOM_PIN,
        fixedPin,
      }),
    },
  });

describe("Device settings", () => {
  it("puts a toggled device-config flag on the wire", async () => {
    const { editor, sent } = setup(Device as never, deviceConfig());

    await userEvent.click(
      await screen.findByLabelText("Double Tap as Button Press"),
    );

    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("device"),
    );
    expect((await editor.commit()).status).toBe("ok");

    const wire = fromWire<Protobuf.Config.Config_DeviceConfig>(sent, "device");
    expect(wire?.doubleTapAsButtonPress).toBe(true);
    // Untouched fields must survive.
    expect(wire?.buttonGpio).toBe(4);
    expect(wire?.buzzerGpio).toBe(2);
    expect(wire?.nodeInfoBroadcastSecs).toBe(10800);
    expect(wire?.role).toBe(Protobuf.Config.Config_DeviceConfig_Role.CLIENT);
  });

  it("does not report the toggle as saved when it was not part of the commit", async () => {
    const { client, editor, sent, gateOn, release } = setup(
      Device as never,
      deviceConfig(),
    );

    client.events.onChannelPacket.dispatch(
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Protobuf.Channel.Channel_Role.PRIMARY,
        settings: create(Protobuf.Channel.ChannelSettingsSchema, {
          psk: new Uint8Array([1]),
        }),
      }),
    );
    editor.setChannel(
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Protobuf.Channel.Channel_Role.PRIMARY,
        settings: create(Protobuf.Channel.ChannelSettingsSchema, {
          psk: new Uint8Array([1]),
          uplinkEnabled: true,
        }),
      }),
    );

    // An unrelated channel save is in flight, held open on its closing commit.
    gateOn("commitEditSettings");
    const pending = editor.commit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await userEvent.click(
      await screen.findByLabelText("Double Tap as Button Press"),
    );
    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("device"),
    );

    release();
    expect((await pending).status).toBe("ok");

    // A genuine begin/commit pair happened on the device, but it never carried
    // the device config — so that edit has to stay pending.
    expect(sent.map((a) => a.payloadVariant.case)).toEqual([
      "beginEditSettings",
      "setChannel",
      "commitEditSettings",
    ]);
    expect(
      fromWire<Protobuf.Config.Config_DeviceConfig>(sent, "device"),
    ).toBeUndefined();
    expect(editor.dirtyRadioSections.value).toContain("device");
    expect(editor.isDirty.value).toBe(true);

    expect((await editor.commit()).status).toBe("ok");
    expect(
      fromWire<Protobuf.Config.Config_DeviceConfig>(sent, "device")
        ?.doubleTapAsButtonPress,
    ).toBe(true);
    expect(editor.isDirty.value).toBe(false);
  });

  it("saves Bluetooth on a device that has no fixed PIN", async () => {
    // `fixed_pin` is 0 until FIXED_PIN pairing is used. The schema used to
    // demand six digits unconditionally, which made this device's Bluetooth
    // form permanently invalid and silently unsavable.
    const { editor, sent } = setup(Bluetooth as never, bluetoothConfig(0));

    await userEvent.click(await screen.findByLabelText("Bluetooth enabled"));

    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("bluetooth"),
    );
    expect((await editor.commit()).status).toBe("ok");

    expect(
      fromWire<Protobuf.Config.Config_BluetoothConfig>(sent, "bluetooth")
        ?.enabled,
    ).toBe(true);
  });

  it("still requires a six-digit PIN for FIXED_PIN pairing", () => {
    // The relaxation is conditional, not a removal: PIN validation still
    // applies where the PIN is actually used.
    const base = {
      enabled: true,
      fixedPin: 0,
    };
    expect(
      BluetoothValidationSchema.safeParse({
        ...base,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
      }).success,
    ).toBe(false);
    expect(
      BluetoothValidationSchema.safeParse({
        ...base,
        fixedPin: 123456,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN,
      }).success,
    ).toBe(true);
    expect(
      BluetoothValidationSchema.safeParse({
        ...base,
        mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.RANDOM_PIN,
      }).success,
    ).toBe(true);
  });
});
