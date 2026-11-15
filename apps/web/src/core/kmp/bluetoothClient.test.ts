// @vitest-environment node
import {
  FakeBluetoothDevice,
  FakeRadio,
  installBluetooth,
  uninstallBrowserDevices,
} from "@app/tests/fakeBrowserDevices.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBluetoothClient, type MeshtasticClient } from "./client.ts";

async function connected(client: MeshtasticClient): Promise<void> {
  await vi.waitFor(
    () => expect(client.connectionState.kind).toBe("connected"),
    { timeout: 8_000, interval: 25 },
  );
}

describe("createBluetoothClient (Kotlin facade over a fake navigator.bluetooth)", () => {
  const clients: MeshtasticClient[] = [];

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.disconnect()));
    uninstallBrowserDevices();
  });

  it("finds the saved device through getDevices, completes the handshake and never prompts", async () => {
    const radio = new FakeRadio();
    const device = new FakeBluetoothDevice("radio-1", "Meshtastic_abcd", radio);
    const bluetooth = installBluetooth([
      new FakeBluetoothDevice("other"),
      device,
    ]);
    const client = await createBluetoothClient({ deviceId: "radio-1" });
    clients.push(client);

    await client.connect();
    await connected(client);

    expect(bluetooth.requestDevice).not.toHaveBeenCalled();
    expect(device.connects).toBe(1);
    expect(device.notifying).toBe(true);
    expect(client.myNodeNum).toBe(radio.myNodeNum);
    expect(
      device.written.every((bytes) => bytes[0] !== 0x94 || bytes.length !== 4),
    ).toBe(true);
  }, 10_000);

  it("uses the device a click handed over", async () => {
    const device = new FakeBluetoothDevice(
      "radio-1",
      undefined,
      new FakeRadio(),
    );
    const bluetooth = installBluetooth([]);
    const client = await createBluetoothClient({ device });
    clients.push(client);

    await client.connect();
    await connected(client);

    expect(bluetooth.requestDevice).not.toHaveBeenCalled();
  }, 10_000);

  it("fails with a clear kind when the device is not permitted, without prompting", async () => {
    const bluetooth = installBluetooth([new FakeBluetoothDevice("other")]);
    const client = await createBluetoothClient({ deviceId: "radio-1" });
    clients.push(client);

    await expect(client.connect()).rejects.toMatchObject({
      name: "bluetooth-unavailable",
    });
    expect(bluetooth.requestDevice).not.toHaveBeenCalled();
  });

  it("fails with a clear kind when Web Bluetooth is missing", async () => {
    const client = await createBluetoothClient({ deviceId: "radio-1" });
    clients.push(client);

    await expect(client.connect()).rejects.toMatchObject({
      name: "bluetooth-unsupported",
      message: "Web Bluetooth is not supported in this browser",
    });
  });

  it("names a device without the Meshtastic service", async () => {
    const device = new FakeBluetoothDevice(
      "radio-1",
      undefined,
      undefined,
      false,
    );
    installBluetooth([device]);
    const client = await createBluetoothClient({ deviceId: "radio-1" });
    clients.push(client);

    await expect(client.connect()).rejects.toMatchObject({
      name: "bluetooth-missing-service",
    });
  });

  it("reconnects through the SDK after the GATT link drops", async () => {
    const device = new FakeBluetoothDevice(
      "radio-1",
      undefined,
      new FakeRadio(),
    );
    const bluetooth = installBluetooth([device]);
    const client = await createBluetoothClient({ deviceId: "radio-1" });
    clients.push(client);
    await client.connect();
    await connected(client);

    device.dropLink();

    await vi.waitFor(
      () => expect(client.connectionState.kind).toBe("reconnecting"),
      { timeout: 2_000, interval: 10 },
    );
    expect(client.connectionState).toMatchObject({
      attempt: 1,
      maxAttempts: 10,
      errorKind: "bluetooth-disconnected",
    });

    await connected(client);
    expect(device.connects).toBe(2);
    expect(bluetooth.requestDevice).not.toHaveBeenCalled();
  }, 15_000);
});
