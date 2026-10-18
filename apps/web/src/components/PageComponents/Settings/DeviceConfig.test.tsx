import { create } from "@bufbuild/protobuf";
import { renderSettingsForm } from "@app/tests/renderSettingsForm.tsx";
import { BluetoothValidationSchema } from "@app/validation/config/bluetooth.ts";
import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { Protobuf } from "@meshtastic/sdk";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

// Protobuf omits default booleans on the wire, so these tests decode what was
// actually sent rather than trusting the editor's state.

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

const primaryChannel = (uplinkEnabled: boolean) =>
  create(Protobuf.Channel.ChannelSchema, {
    index: 0,
    role: Protobuf.Channel.Channel_Role.PRIMARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, {
      psk: new Uint8Array([1]),
      uplinkEnabled,
    }),
  });

const renderDevice = () =>
  renderSettingsForm(<Device onFormInit={() => {}} />, {
    config: [deviceConfig()],
  });

describe("Device settings", () => {
  it("puts a toggled device-config flag on the wire", async () => {
    const { editor, radio } = renderDevice();

    await userEvent.click(await screen.findByLabelText("Double Tap as Button"));
    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("device"),
    );
    expect((await editor.commit()).status).toBe("ok");

    const wire = radio.sentConfig("device");
    expect(wire?.doubleTapAsButtonPress).toBe(true);
    expect(wire?.buttonGpio).toBe(4);
    expect(wire?.buzzerGpio).toBe(2);
    expect(wire?.nodeInfoBroadcastSecs).toBe(10800);
    expect(wire?.role).toBe(Protobuf.Config.Config_DeviceConfig_Role.CLIENT);
  });

  it("keeps the toggle pending when it was flipped during another save", async () => {
    const { client, editor, radio } = renderDevice();
    client.events.onChannelPacket.dispatch(primaryChannel(false));
    editor.setChannel(primaryChannel(true));

    const held = radio.hold("commitEditSettings");
    const pending = editor.commit();
    await held.reached;

    await userEvent.click(await screen.findByLabelText("Double Tap as Button"));
    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("device"),
    );
    held.release();
    expect((await pending).status).toBe("ok");

    expect(radio.cases()).toEqual([
      "beginEditSettings",
      "setChannel",
      "commitEditSettings",
    ]);
    expect(editor.dirtyRadioSections.value).toContain("device");

    expect((await editor.commit()).status).toBe("ok");
    expect(radio.sentConfig("device")?.doubleTapAsButtonPress).toBe(true);
    expect(editor.isDirty.value).toBe(false);
  });

  it("saves Bluetooth on a device that has no fixed PIN", async () => {
    // Radios that never used FIXED_PIN pairing report a PIN of 0.
    const { editor, radio } = renderSettingsForm(
      <Bluetooth onFormInit={() => {}} />,
      { config: [bluetoothConfig(0)] },
    );

    await userEvent.click(await screen.findByLabelText("Bluetooth enabled"));
    await waitFor(() =>
      expect(editor.dirtyRadioSections.value).toContain("bluetooth"),
    );
    expect((await editor.commit()).status).toBe("ok");

    expect(radio.sentConfig("bluetooth")?.enabled).toBe(true);
  });

  it("still requires a six-digit PIN for FIXED_PIN pairing", () => {
    const { FIXED_PIN, RANDOM_PIN } =
      Protobuf.Config.Config_BluetoothConfig_PairingMode;
    const parse = (mode: number, fixedPin: number) =>
      BluetoothValidationSchema.safeParse({ enabled: true, mode, fixedPin })
        .success;

    expect(parse(FIXED_PIN, 0)).toBe(false);
    expect(parse(FIXED_PIN, 123456)).toBe(true);
    expect(parse(RANDOM_PIN, 0)).toBe(true);
  });
});
