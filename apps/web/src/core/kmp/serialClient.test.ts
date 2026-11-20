// @vitest-environment node
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import type { ConnectionStateJs } from "@meshtastic/sdk-kmp";
import {
  FakeRadio,
  FakeSerialPort,
  framed,
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

  it("decodes frames the port delivers as views into a larger buffer, several per chunk and split", async () => {
    const radio = new FakeRadio();
    const port = new FakeSerialPort(ids, radio);
    installSerial([port]);
    const client = await createSerialClient(ids);
    clients.push(client);
    const session = new MeshSession(client);
    const seen: string[] = [];
    session.events.onFromRadio.subscribe((frame) => {
      seen.push(frame.payloadVariant.case ?? "none");
    });
    await client.connect();
    await connected(client);
    seen.length = 0;

    const first = toBinary(
      Protobuf.Mesh.FromRadioSchema,
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "nodeInfo",
          value: create(Protobuf.Mesh.NodeInfoSchema, {
            num: 0x2000,
            user: { longName: "x".repeat(200) },
          }),
        },
      }),
    );
    const second = toBinary(
      Protobuf.Mesh.FromRadioSchema,
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: { case: "configCompleteId", value: 5 },
      }),
    );
    const wire = new Uint8Array([...framed(first), ...framed(second)]);
    const padded = new Uint8Array(wire.length + 32);
    padded.set(wire, 16);
    const view = padded.subarray(16, 16 + wire.length);
    port.push(view.subarray(0, 100));
    port.push(view.subarray(100, wire.length - 3));
    port.push(view.subarray(wire.length - 3));

    await vi.waitFor(() =>
      expect(seen).toEqual(["nodeInfo", "configCompleteId"]),
    );
    expect(session.nodes.byNum(0x2000)?.user?.longName).toBe("x".repeat(200));
    session.close();
  }, 15_000);

  it("delivers a mesh packet once, through onPacket and not the raw frame stream", async () => {
    const radio = new FakeRadio();
    const port = new FakeSerialPort(ids, radio);
    installSerial([port]);
    const client = await createSerialClient(ids);
    clients.push(client);
    await client.connect();
    await connected(client);
    const frames: Uint8Array[] = [];
    const packets: Uint8Array[] = [];
    client.onFromRadio((bytes) => frames.push(bytes));
    client.onPacket((bytes) => packets.push(bytes));

    const text = toBinary(
      Protobuf.Mesh.FromRadioSchema,
      create(Protobuf.Mesh.FromRadioSchema, {
        id: 41,
        payloadVariant: {
          case: "packet",
          value: create(Protobuf.Mesh.MeshPacketSchema, {
            from: 0x2000,
            to: 0xffffffff,
            id: 7,
            payloadVariant: {
              case: "decoded",
              value: create(Protobuf.Mesh.DataSchema, {
                portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
                payload: new TextEncoder().encode("hi"),
              }),
            },
          }),
        },
      }),
    );
    const notice = toBinary(
      Protobuf.Mesh.FromRadioSchema,
      create(Protobuf.Mesh.FromRadioSchema, {
        id: 42,
        payloadVariant: {
          case: "clientNotification",
          value: create(Protobuf.Mesh.ClientNotificationSchema, {
            message: "ok",
          }),
        },
      }),
    );
    port.push(new Uint8Array([...framed(text), ...framed(notice)]));

    await vi.waitFor(() => {
      expect(frames).toHaveLength(1);
      expect(packets).toHaveLength(1);
    });
    expect(
      frames.map(
        (bytes) =>
          fromBinary(Protobuf.Mesh.FromRadioSchema, bytes).payloadVariant.case,
      ),
    ).toEqual(["clientNotification"]);
    expect(
      packets.map(
        (bytes) => fromBinary(Protobuf.Mesh.MeshPacketSchema, bytes).id,
      ),
    ).toEqual([7]);
  }, 15_000);

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
