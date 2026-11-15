import { FakeKmpClient, state } from "@core/kmp/fakeClient.ts";
import type { BluetoothTarget, SerialTarget } from "@core/kmp/client.ts";
import type { Connection } from "@app/core/stores/deviceStore/types";
import { useDeviceStore } from "@core/stores";
import {
  FakeBluetoothDevice,
  FakeSerialPort,
  installBluetooth as installFakeBluetooth,
  installSerial as installFakeSerial,
  uninstallBrowserDevices,
} from "@app/tests/fakeBrowserDevices.ts";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "./useConnections.ts";

const kmp = vi.hoisted(
  (): {
    client?: FakeKmpClient;
    serialTargets: SerialTarget[];
    bluetoothTargets: BluetoothTarget[];
  } => ({ serialTargets: [], bluetoothTargets: [] }),
);

vi.mock("@core/sdkStorage.ts", () => ({
  getStorageDb: async () => {
    throw new Error("no storage in tests");
  },
  coordinator: undefined,
}));

vi.mock("@core/kmp/client.ts", async () => {
  const { FakeKmpClient } = await import("@core/kmp/fakeClient.ts");
  return {
    createSerialClient: async (target: SerialTarget) => {
      kmp.serialTargets.push(target);
      kmp.client = new FakeKmpClient();
      return kmp.client;
    },
    createBluetoothClient: async (target: BluetoothTarget) => {
      kmp.bluetoothTargets.push(target);
      kmp.client = new FakeKmpClient();
      return kmp.client;
    },
  };
});

const ids = { usbVendorId: 0x303a, usbProductId: 0x1001 };

const saved = (id: number): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

function fakePort(info: SerialPortInfo): SerialPort {
  return new FakeSerialPort(info);
}

function installSerial(ports: SerialPort[], picked?: SerialPort) {
  const serial = installFakeSerial(ports);
  if (picked) serial.requestPort.mockResolvedValue(picked);
  return serial.requestPort;
}

function installBluetooth(
  devices: FakeBluetoothDevice[],
  picked?: FakeBluetoothDevice,
) {
  const bluetooth = installFakeBluetooth(devices);
  if (picked) bluetooth.requestDevice.mockResolvedValue(picked);
  return bluetooth.requestDevice;
}

describe("useConnections over the Kotlin SDK (Serial and Bluetooth)", () => {
  beforeEach(() => {
    kmp.client = undefined;
    kmp.serialTargets.length = 0;
    kmp.bluetoothTargets.length = 0;
  });

  afterEach(() => {
    uninstallBrowserDevices();
  });

  it("reopens a saved serial connection through the SDK without prompting", async () => {
    const requestPort = installSerial([fakePort(ids)]);
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
      ...ids,
    });

    const ok = await act(() => result.current.connect(conn.id));

    expect(ok).toBe(true);
    expect(requestPort).not.toHaveBeenCalled();
    expect(kmp.serialTargets).toEqual([{ port: undefined, ...ids }]);
    expect(saved(conn.id)?.status).toBe("configuring");
    await act(() => result.current.disconnect(conn.id));
  });

  it("hands a click's permitted port to the SDK without prompting", async () => {
    const radio = fakePort(ids);
    const requestPort = installSerial([radio]);
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
      ...ids,
    });

    await act(() => result.current.connect(conn.id, { allowPrompt: true }));

    expect(requestPort).not.toHaveBeenCalled();
    expect(kmp.serialTargets).toEqual([{ port: radio, ...ids }]);
    await act(() => result.current.disconnect(conn.id));
  });

  it("shows the port picker on a click only when no permitted port matches, and saves the picked ids", async () => {
    const newIds = { usbVendorId: 0x10c4, usbProductId: 0xea60 };
    const picked = fakePort(newIds);
    const requestPort = installSerial([], picked);
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
      ...ids,
    });

    await act(() => result.current.connect(conn.id, { allowPrompt: true }));

    expect(requestPort).toHaveBeenCalledWith({ filters: [ids] });
    expect(kmp.serialTargets).toEqual([{ port: picked, ...newIds }]);
    expect(saved(conn.id)).toMatchObject(newIds);

    await act(() => result.current.disconnect(conn.id));
    await act(() => result.current.connect(conn.id));
    expect(requestPort).toHaveBeenCalledTimes(1);
    expect(kmp.serialTargets[1]).toEqual({ port: picked, ...newIds });
  });

  it("reports a missing Web Serial API instead of prompting", async () => {
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
      ...ids,
    });

    const ok = await act(() =>
      result.current.connect(conn.id, { allowPrompt: true }),
    );

    expect(ok).toBe(false);
    expect(saved(conn.id)).toMatchObject({
      status: "error",
      error: "Web Serial is not supported in this browser",
    });
    expect(kmp.serialTargets).toEqual([]);
  });

  it("reopens a saved Bluetooth connection by device id without prompting", async () => {
    const requestDevice = installBluetooth([
      new FakeBluetoothDevice("radio-1"),
    ]);
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "bluetooth",
      name: "Radio",
      deviceId: "radio-1",
    });

    await act(() => result.current.connect(conn.id));

    expect(requestDevice).not.toHaveBeenCalled();
    expect(kmp.bluetoothTargets).toEqual([
      { device: undefined, deviceId: "radio-1" },
    ]);
    await act(() => result.current.disconnect(conn.id));
  });

  it("shows the device picker on a click only when the device is unknown, and saves the picked device", async () => {
    const picked = new FakeBluetoothDevice("radio-2", "Meshtastic_abcd");
    const requestDevice = installBluetooth([], picked);
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "bluetooth",
      name: "Radio",
      deviceId: "radio-1",
    });

    await act(() => result.current.connect(conn.id, { allowPrompt: true }));

    expect(requestDevice).toHaveBeenCalledTimes(1);
    expect(kmp.bluetoothTargets).toEqual([
      { device: picked, deviceId: "radio-2" },
    ]);
    expect(saved(conn.id)).toMatchObject({
      deviceId: "radio-2",
      deviceName: "Meshtastic_abcd",
    });
    await act(() => result.current.disconnect(conn.id));
  });

  it("keeps the device the form picked for later connects", async () => {
    const device = new FakeBluetoothDevice("radio-3");
    const requestDevice = installBluetooth([]);
    const { result } = renderHook(() => useConnections());

    const conn = await act(() =>
      result.current.addConnectionAndConnect(
        { type: "bluetooth", name: "Radio", deviceId: device.id },
        { bluetoothDevice: device },
      ),
    );

    expect(requestDevice).not.toHaveBeenCalled();
    expect(kmp.bluetoothTargets).toEqual([{ device, deviceId: "radio-3" }]);
    await act(() => result.current.disconnect(conn.id));
  });

  it("shows the SDK's reconnect attempts after the device drops", async () => {
    installSerial([fakePort(ids)]);
    const { result } = renderHook(() => useConnections());
    const conn = result.current.addConnection({
      type: "serial",
      name: "Serial",
      ...ids,
    });
    await act(() => result.current.connect(conn.id));
    const client = kmp.client;
    if (!client) throw new Error("no client created");

    act(() =>
      client.setState(
        state("reconnecting", { attempt: 1, errorKind: "serial-disconnected" }),
      ),
    );
    expect(saved(conn.id)).toMatchObject({
      status: "connecting",
      reconnect: { attempt: 1, maxAttempts: 10 },
    });

    act(() => client.setState(state("connected")));
    expect(saved(conn.id)).toMatchObject({
      status: "configuring",
      reconnect: undefined,
    });
    await act(() => result.current.disconnect(conn.id));
  });
});
