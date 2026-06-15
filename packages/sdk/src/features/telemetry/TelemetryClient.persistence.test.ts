import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import { InMemoryTelemetryRepository } from "./infrastructure/repositories/InMemoryTelemetryRepository.ts";

const dispatch = (client: MeshClient, from: number, ms: number, battery = 80): void => {
  client.events.onTelemetryPacket.dispatch({
    id: ms,
    from,
    to: 0,
    channel: ChannelNumber.Primary,
    type: "broadcast",
    rxTime: new Date(ms),
    data: create(Protobuf.Telemetry.TelemetrySchema, {
      time: ms,
      variant: {
        case: "deviceMetrics",
        value: create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: battery }),
      },
    }),
  });
};

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("TelemetryClient persistence", () => {
  it("appends each incoming packet to the repository", async () => {
    const repository = new InMemoryTelemetryRepository();
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport, telemetry: { repository } });

    dispatch(client, 100, 1000);
    dispatch(client, 100, 2000);
    await flush();

    const persisted = await repository.loadRecent(100, 10);
    expect(persisted).toHaveLength(2);
  });

  it("hydrates the in-memory store on first history()/latest() subscription", async () => {
    const repository = new InMemoryTelemetryRepository();
    await repository.append({
      nodeNum: 200,
      time: new Date(500),
      kind: "deviceMetrics",
      value: create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: 60 }),
    });

    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport, telemetry: { repository } });

    const sig = client.telemetry.history(200);
    await flush();

    expect(sig.value).toHaveLength(1);
    expect(sig.value[0]?.value.batteryLevel).toBe(60);
  });

  it("retention prune trims the repository to maxPerNode", async () => {
    const repository = new InMemoryTelemetryRepository();
    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      telemetry: { repository, retention: { maxPerNode: 3 } },
    });

    for (let i = 0; i < 10; i++) {
      dispatch(client, 300, (i + 1) * 1000);
    }
    await flush();

    const persisted = await repository.loadRecent(300, 100);
    expect(persisted).toHaveLength(3);
  });
});
