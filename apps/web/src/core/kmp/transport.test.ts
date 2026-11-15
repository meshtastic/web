import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { DeviceStatusEnum, type DeviceOutput, Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { FakeKmpClient, state } from "./fakeClient.ts";
import { kmpTransport } from "./transport.ts";

async function readAll(
  stream: ReadableStream<DeviceOutput>,
  count: number,
): Promise<DeviceOutput[]> {
  const reader = stream.getReader();
  const out: DeviceOutput[] = [];
  while (out.length < count) {
    const { value, done } = await reader.read();
    if (done) break;
    out.push(value);
  }
  reader.releaseLock();
  return out;
}

describe("kmpTransport", () => {
  it("replays FromRadio frames from the SDK as packets", async () => {
    const client = new FakeKmpClient();
    await client.connect();
    const transport = kmpTransport(client);
    const myInfo = toBinary(
      Protobuf.Mesh.FromRadioSchema,
      create(Protobuf.Mesh.FromRadioSchema, {
        payloadVariant: {
          case: "myInfo",
          value: { myNodeNum: 0x0a0b0c0d },
        },
      }),
    );
    client.emitFrame(myInfo);

    const [status, packet] = await readAll(transport.fromDevice, 2);
    expect(status).toEqual({
      type: "status",
      data: { status: DeviceStatusEnum.DeviceConnected },
    });
    if (packet?.type !== "packet") throw new Error("expected a packet");
    const decoded = fromBinary(Protobuf.Mesh.FromRadioSchema, packet.data);
    expect(decoded.payloadVariant.case).toBe("myInfo");
  });

  it("writes ToRadio bytes through the SDK", async () => {
    const client = new FakeKmpClient();
    await client.connect();
    const transport = kmpTransport(client);
    const writer = transport.toDevice.getWriter();
    const bytes = new Uint8Array([1, 2, 3]);
    await writer.write(bytes);
    expect(client.sent).toEqual([bytes]);
  });

  it("rejects writes while the SDK is reconnecting", async () => {
    const client = new FakeKmpClient();
    await client.connect();
    const transport = kmpTransport(client);
    client.setState(state("reconnecting", { attempt: 2 }));
    const writer = transport.toDevice.getWriter();
    await expect(writer.write(new Uint8Array([1]))).rejects.toMatchObject({
      name: "not-connected",
    });
  });

  it("maps SDK states to device status events", async () => {
    const client = new FakeKmpClient();
    await client.connect();
    const transport = kmpTransport(client);
    client.setState(state("reconnecting", { attempt: 1 }));
    client.setState(state("configuring", { phase: "Stage1" }));
    client.setState(state("connected"));
    const events = await readAll(transport.fromDevice, 3);
    expect(
      events.map((e) => (e.type === "status" ? e.data.status : e.type)),
    ).toEqual([
      DeviceStatusEnum.DeviceConnected,
      DeviceStatusEnum.DeviceReconnecting,
      DeviceStatusEnum.DeviceConnected,
    ]);
  });

  it("disconnects the SDK client and closes the stream once", async () => {
    const client = new FakeKmpClient();
    await client.connect();
    const transport = kmpTransport(client);
    await transport.disconnect();
    await transport.disconnect();
    expect(client.disconnects).toHaveLength(2);
    const reader = transport.fromDevice.getReader();
    const first = await reader.read();
    expect(first).toEqual({
      value: {
        type: "status",
        data: { status: DeviceStatusEnum.DeviceConnected },
      },
      done: false,
    });
    const last = await reader.read();
    expect(last.done).toBe(true);
    client.emitFrame(new Uint8Array([9]));
  });
});
