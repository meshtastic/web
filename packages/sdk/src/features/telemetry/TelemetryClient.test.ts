import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";

describe("TelemetryClient", () => {
  it("captures latest reading per node and grows history", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onTelemetryPacket.dispatch({
      id: 1,
      from: 100,
      to: 0,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(1000),
      data: create(Protobuf.Telemetry.TelemetrySchema, {
        time: 1000,
        variant: {
          case: "deviceMetrics",
          value: create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: 80 }),
        },
      }),
    });
    client.events.onTelemetryPacket.dispatch({
      id: 2,
      from: 100,
      to: 0,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(2000),
      data: create(Protobuf.Telemetry.TelemetrySchema, {
        time: 2000,
        variant: {
          case: "deviceMetrics",
          value: create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: 70 }),
        },
      }),
    });

    expect(client.telemetry.latest(100).value?.kind).toBe("deviceMetrics");
    expect(client.telemetry.history(100).value.length).toBe(2);
    expect(client.telemetry.latest(999).value).toBeUndefined();
  });
});
