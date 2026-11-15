// @vitest-environment node
import type { ConnectionStateJs } from "@meshtastic/sdk-kmp";
import {
  FakeRadio,
  FakeSerialPort,
  installSerial,
  uninstallBrowserDevices,
} from "@app/tests/fakeBrowserDevices.ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSerialClient,
  loadKmp,
  type MeshtasticClient,
} from "./client.ts";
import { MeshSession } from "./session.ts";

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

  for (const order of ["read error first", "disconnect event first"]) {
    it(`reconnects after Chrome's unplug sequence (${order}) and reopens the same port once it is back`, async () => {
      const radio = new FakeRadio();
      const port = new FakeSerialPort(ids, radio);
      const serial = installSerial([port]);
      const client = await createSerialClient(ids);
      clients.push(client);
      const states: ConnectionStateJs[] = [];
      client.onConnectionState((state) => states.push(state));
      const lines: string[] = [];
      (await loadKmp()).setSdkLogger((level, tag, message) =>
        lines.push(`${level} ${tag}: ${message}`),
      );
      await client.connect();
      await connected(client);

      if (order === "disconnect event first") {
        serial.dispatch("disconnect", port);
        await new Promise((resolve) => setTimeout(resolve, 0));
        port.unplug();
      } else {
        port.unplug();
        await new Promise((resolve) => setTimeout(resolve, 0));
        serial.dispatch("disconnect", port);
      }

      await vi.waitFor(
        () => expect(client.connectionState.kind).toBe("reconnecting"),
        { timeout: 2_000, interval: 10 },
      );
      expect(client.connectionState).toMatchObject({
        attempt: 1,
        maxAttempts: 10,
        errorKind: "serial-disconnected",
      });

      await new Promise((resolve) => setTimeout(resolve, 1_500));
      port.replug();
      serial.dispatch("connect", port);

      await connected(client);
      expect(port.opens).toBe(2);
      expect(serial.requestPort).not.toHaveBeenCalled();
      expect(states.map((s) => s.kind)).toEqual(
        expect.arrayContaining(["connected", "reconnecting", "connected"]),
      );
      expect(lines).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /^warn MeshEngine: Transport error: (Serial device disconnected|The device has been lost\.)$/,
          ),
          expect.stringMatching(
            /^info MeshEngine: Auto-reconnect attempt 1 scheduled in \d+ ms$/,
          ),
          expect.stringMatching(
            /^info Client: Connection state: reconnecting \(attempt 1\): /,
          ),
          "info MeshEngine: Auto-reconnect attempt 1 succeeded",
        ]),
      );
    }, 15_000);
  }

  it("hands the session its own node and channels again after an auto-reconnect", async () => {
    const radio = new FakeRadio(0x0a0b0c0d, { nodes: 3, channels: 2 });
    const port = new FakeSerialPort(ids, radio);
    const serial = installSerial([port]);
    const client = await createSerialClient(ids);
    clients.push(client);
    const session = new MeshSession(client);
    await client.connect();
    await connected(client);
    const mine = () =>
      session.nodes.list.peek().some((n) => n.num === session.myNodeNum);
    expect(session.device.myNodeNum.peek()).toBe(0x0a0b0c0d);
    expect(mine()).toBe(true);
    expect(session.channels.list.peek()).toHaveLength(2);

    port.unplug();
    serial.dispatch("disconnect", port);
    await vi.waitFor(
      () => expect(client.connectionState.kind).toBe("reconnecting"),
      { timeout: 2_000, interval: 10 },
    );
    port.replug();
    serial.dispatch("connect", port);
    await connected(client);
    await vi.waitFor(() =>
      expect(session.progress.peek()).toMatchObject({ phase: "configured" }),
    );

    expect(session.device.myNodeNum.peek()).toBe(0x0a0b0c0d);
    expect(session.nodes.list.peek()).toHaveLength(4);
    expect(mine()).toBe(true);
    expect(session.channels.list.peek()).toHaveLength(2);
    session.close();
  }, 15_000);

  it("reconnects when a write fails before the OS reports the loss", async () => {
    const radio = new FakeRadio();
    const port = new FakeSerialPort(ids, radio);
    installSerial([port]);
    const client = await createSerialClient(ids);
    clients.push(client);
    const states: ConnectionStateJs[] = [];
    client.onConnectionState((state) => states.push(state));
    await client.connect();
    await connected(client);

    port.failWrites();
    const outcome = await client.sendText("hi", 0xffffffff, 0).outcome;
    expect(outcome.ok).toBe(false);

    await vi.waitFor(
      () => expect(client.connectionState.kind).toBe("reconnecting"),
      { timeout: 2_000, interval: 10 },
    );
    await connected(client);
    expect(port.opens).toBe(2);
    const kinds = states.map((s) => s.kind);
    expect(kinds.slice(kinds.indexOf("connected"))).not.toContain(
      "disconnected",
    );
  }, 15_000);
});
