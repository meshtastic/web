import type { Connection } from "@core/stores/deviceStore/types";
import {
  FakeBluetoothDevice,
  FakeSerialPort,
  installBluetooth as installFakeBluetooth,
  installSerial as installFakeSerial,
  uninstallBrowserDevices,
} from "@app/tests/fakeBrowserDevices.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type BluetoothConnection,
  MESHTASTIC_BLE_SERVICE,
  matchesSavedPort,
  permittedSerialPort,
  pickBluetoothDevice,
  pickSerialPort,
  probeConnection,
  type SerialConnection,
} from "./browserDevices.ts";

const ids = { usbVendorId: 0x303a, usbProductId: 0x1001 };

const savedSerial: SerialConnection = {
  id: 1,
  name: "Serial: 303a:1001",
  type: "serial",
  status: "disconnected",
  createdAt: 0,
  ...ids,
};

const savedBluetooth: BluetoothConnection = {
  id: 2,
  name: "Radio",
  type: "bluetooth",
  status: "disconnected",
  createdAt: 0,
  deviceId: "radio-1",
};

function fakePort(info: SerialPortInfo): SerialPort {
  return new FakeSerialPort(info);
}

function installSerial(ports: SerialPort[]) {
  const serial = installFakeSerial(ports);
  const [first] = ports;
  if (first) serial.requestPort.mockResolvedValue(first);
  return serial;
}

function installBluetooth(ids: string[]) {
  const devices = ids.map((id) => new FakeBluetoothDevice(id));
  const bluetooth = installFakeBluetooth(devices);
  const [first] = devices;
  if (first) bluetooth.requestDevice.mockResolvedValue(first);
  return bluetooth;
}

afterEach(() => {
  uninstallBrowserDevices();
  vi.unstubAllGlobals();
});

describe("permittedSerialPort", () => {
  it("picks the only permitted port with the saved USB ids", async () => {
    const other = fakePort({ usbVendorId: 0x10c4, usbProductId: 0xea60 });
    const radio = fakePort(ids);
    installSerial([other, radio]);

    expect(matchesSavedPort(radio, savedSerial)).toBe(true);
    expect(matchesSavedPort(other, savedSerial)).toBe(false);
    await expect(permittedSerialPort(savedSerial)).resolves.toBe(radio);
  });

  it("refuses to guess between permitted ports sharing the ids", async () => {
    installSerial([fakePort(ids), fakePort(ids)]);
    await expect(permittedSerialPort(savedSerial)).resolves.toBeUndefined();
  });

  it("matches nothing when the connection has no saved ids", async () => {
    installSerial([fakePort(ids)]);
    const unsaved: SerialConnection = {
      ...savedSerial,
      usbVendorId: undefined,
    };
    await expect(permittedSerialPort(unsaved)).resolves.toBeUndefined();
  });

  it("is undefined without Web Serial", async () => {
    await expect(permittedSerialPort(savedSerial)).resolves.toBeUndefined();
  });
});

describe("pickers", () => {
  it("filters the port picker to the saved USB ids", async () => {
    const { requestPort } = installSerial([fakePort(ids)]);
    await pickSerialPort(savedSerial);
    expect(requestPort).toHaveBeenCalledWith({ filters: [ids] });
  });

  it("filters the device picker to the Meshtastic service", async () => {
    const { requestDevice } = installBluetooth(["radio-1"]);
    await pickBluetoothDevice();
    expect(requestDevice).toHaveBeenCalledWith({
      filters: [{ services: [MESHTASTIC_BLE_SERVICE] }],
    });
  });

  it("names the missing API", async () => {
    await expect(pickSerialPort(savedSerial)).rejects.toMatchObject({
      name: "serial-unsupported",
      message: "Web Serial is not supported in this browser",
    });
    await expect(pickBluetoothDevice()).rejects.toMatchObject({
      name: "bluetooth-unsupported",
    });
  });
});

describe("probeConnection", () => {
  const savedHttp: Connection = {
    id: 3,
    type: "http",
    name: "Radio",
    url: "http://192.168.1.10",
    status: "disconnected",
    createdAt: 0,
  };

  function installLocalNetworkPermission(state: string) {
    vi.stubGlobal("location", { protocol: "https:" });
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal("navigator", {
      permissions: { query: vi.fn().mockResolvedValue({ state }) },
    });
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("does not fetch a local target while the local network permission would prompt", async () => {
    const fetch = installLocalNetworkPermission("prompt");
    await expect(probeConnection(savedHttp)).resolves.toEqual({
      status: "disconnected",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("probes a local target once the permission is granted", async () => {
    const fetch = installLocalNetworkPermission("granted");
    await expect(probeConnection(savedHttp)).resolves.toEqual({
      status: "online",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a permitted serial port as online", async () => {
    installSerial([fakePort(ids)]);
    await expect(probeConnection(savedSerial)).resolves.toEqual({
      status: "online",
    });
  });

  it("reports a known Bluetooth device as online and an unknown one as disconnected", async () => {
    installBluetooth(["radio-1"]);
    await expect(probeConnection(savedBluetooth)).resolves.toEqual({
      status: "online",
    });
    const other: Connection = { ...savedBluetooth, deviceId: "radio-2" };
    await expect(probeConnection(other)).resolves.toEqual({
      status: "disconnected",
    });
  });

  it("is disconnected without the APIs", async () => {
    await expect(probeConnection(savedSerial)).resolves.toEqual({
      status: "disconnected",
    });
    await expect(probeConnection(savedBluetooth)).resolves.toEqual({
      status: "disconnected",
    });
  });
});
