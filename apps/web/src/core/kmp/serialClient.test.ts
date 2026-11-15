// @vitest-environment node
import type { ConnectionStateJs } from "@meshtastic/sdk-kmp";
import {
  FakeRadio,
  FakeSerialPort,
  installSerial,
  uninstallBrowserDevices,
} from "@app/tests/fakeBrowserDevices.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSerialClient, type MeshtasticClient } from "./client.ts";

const ids = { usbVendorId: 0x303a, usbProductId: 0x1001 };

async function connected(client: MeshtasticClient): Promise<void> {
  await vi.waitFor(
    () => expect(client.connectionState.kind).toBe("connected"),
    { timeout: 8_000, interval: 25 },
  );
}

describe("createSerialClient (Kotlin facade over a fake navigator.serial)", () => {
  const clients: MeshtasticClient[] = [];

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.disconnect()));
    uninstallBrowserDevices();
  });

  it("reopens the permitted port by USB ids, completes the handshake and never prompts", async () => {
    const radio = new FakeRadio();
    const port = new FakeSerialPort(ids, radio);
    const serial = installSerial([
      new FakeSerialPort({ usbVendorId: 0x10c4, usbProductId: 0xea60 }),
      port,
    ]);
    const client = await createSerialClient(ids);
    clients.push(client);
    const states: ConnectionStateJs[] = [];
    client.onConnectionState((state) => states.push(state));
    const frames: Uint8Array[] = [];
    client.onFromRadio((bytes) => frames.push(bytes));

    await client.connect();
    await connected(client);

    expect(serial.requestPort).not.toHaveBeenCalled();
    expect(port.opens).toBe(1);
    expect(client.myNodeNum).toBe(radio.myNodeNum);
    expect(
      radio.received.filter((m) => m.payloadVariant.case === "wantConfigId"),
    ).toHaveLength(2);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(states.map((s) => s.kind)).toContain("configuring");
    expect(port.written[0]).toEqual(Uint8Array.of(0x94, 0x94, 0x94, 0x94));
  }, 10_000);

  it("uses the port a click handed over", async () => {
    const port = new FakeSerialPort(ids, new FakeRadio());
    const serial = installSerial([]);
    const client = await createSerialClient({ port, ...ids });
    clients.push(client);

    await client.connect();
    await connected(client);

    expect(serial.requestPort).not.toHaveBeenCalled();
    expect(port.opens).toBe(1);
  }, 10_000);

  it("fails with a clear kind when no permitted port matches, without prompting", async () => {
    const serial = installSerial([
      new FakeSerialPort({ usbVendorId: 0x10c4, usbProductId: 0xea60 }),
    ]);
    const client = await createSerialClient(ids);
    clients.push(client);

    await expect(client.connect()).rejects.toMatchObject({
      name: "serial-unavailable",
      message: "Serial port not available. Re-select the port.",
    });
    expect(serial.requestPort).not.toHaveBeenCalled();
    expect(client.connectionState.kind).toBe("disconnected");
  });

  it("fails with a clear kind when Web Serial is missing", async () => {
    const client = await createSerialClient(ids);
    clients.push(client);

    await expect(client.connect()).rejects.toMatchObject({
      name: "serial-unsupported",
      message: "Web Serial is not supported in this browser",
    });
  });

  it("reconnects through the SDK after an unplug, and reopens the replugged port", async () => {
    const radio = new FakeRadio();
    const port = new FakeSerialPort(ids, radio);
    const serial = installSerial([port]);
    const client = await createSerialClient(ids);
    clients.push(client);
    const states: ConnectionStateJs[] = [];
    client.onConnectionState((state) => states.push(state));
    await client.connect();
    await connected(client);

    port.unplug();
    serial.dispatch("disconnect", port);

    await vi.waitFor(
      () => expect(client.connectionState.kind).toBe("reconnecting"),
      { timeout: 2_000, interval: 10 },
    );
    expect(client.connectionState).toMatchObject({
      attempt: 1,
      maxAttempts: 10,
      errorKind: "serial-disconnected",
    });

    const replugged = new FakeSerialPort(ids, radio);
    serial.ports = [replugged];
    serial.dispatch("connect", replugged);

    await connected(client);
    expect(replugged.opens).toBe(1);
    expect(serial.requestPort).not.toHaveBeenCalled();
    expect(states.map((s) => s.kind)).toEqual(
      expect.arrayContaining(["connected", "reconnecting", "connected"]),
    );
  }, 15_000);
});
