import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";

/**
 * Create a text message packet
 */
export function createTextMessagePacket(
  from: number,
  to: number,
  message: string,
  channel: number,
  id: number,
): Protobuf.Mesh.FromRadio {
  const dataPacket = create(Protobuf.Mesh.DataSchema, {
    portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
    payload: new TextEncoder().encode(message),
  });

  const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
    from,
    to,
    channel,
    id,
    rxTime: Math.floor(Date.now() / 1000),
    rxSnr: Math.random() * 10 - 2,
    rxRssi: Math.floor(-50 - Math.random() * 70),
    hopLimit: 3,
    hopStart: 3,
    payloadVariant: {
      case: "decoded",
      value: dataPacket,
    },
  });

  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "packet",
      value: meshPacket,
    },
  });
}

/**
 * Create a position update packet
 */
export function createPositionPacket(
  from: number,
  latitude: number,
  longitude: number,
  altitude: number,
  id: number,
): Protobuf.Mesh.FromRadio {
  const position = create(Protobuf.Mesh.PositionSchema, {
    latitudeI: Math.round(latitude * 1e7),
    longitudeI: Math.round(longitude * 1e7),
    altitude,
    time: Math.floor(Date.now() / 1000),
    locationSource: Protobuf.Mesh.Position_LocSource.LOC_INTERNAL,
    satsInView: 8,
  });

  const dataPacket = create(Protobuf.Mesh.DataSchema, {
    portnum: Protobuf.Portnums.PortNum.POSITION_APP,
    payload: toBinary(Protobuf.Mesh.PositionSchema, position),
  });

  const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
    from,
    to: 0xffffffff, // broadcast
    channel: 0,
    id,
    rxTime: Math.floor(Date.now() / 1000),
    rxSnr: Math.random() * 10 - 2,
    rxRssi: Math.floor(-50 - Math.random() * 70),
    hopLimit: 3,
    hopStart: 3,
    payloadVariant: {
      case: "decoded",
      value: dataPacket,
    },
  });

  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "packet",
      value: meshPacket,
    },
  });
}

/**
 * Create a telemetry packet with device metrics
 */
export function createTelemetryPacket(
  from: number,
  batteryLevel: number,
  voltage: number,
  channelUtilization: number,
  airUtilTx: number,
  id: number,
): Protobuf.Mesh.FromRadio {
  const telemetry = create(Protobuf.Telemetry.TelemetrySchema, {
    time: Math.floor(Date.now() / 1000),
    variant: {
      case: "deviceMetrics",
      value: create(Protobuf.Telemetry.DeviceMetricsSchema, {
        batteryLevel,
        voltage,
        channelUtilization,
        airUtilTx,
        uptimeSeconds: Math.floor(Math.random() * 86400),
      }),
    },
  });

  const dataPacket = create(Protobuf.Mesh.DataSchema, {
    portnum: Protobuf.Portnums.PortNum.TELEMETRY_APP,
    payload: toBinary(Protobuf.Telemetry.TelemetrySchema, telemetry),
  });

  const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
    from,
    to: 0xffffffff, // broadcast
    channel: 0,
    id,
    rxTime: Math.floor(Date.now() / 1000),
    rxSnr: Math.random() * 10 - 2,
    rxRssi: Math.floor(-50 - Math.random() * 70),
    hopLimit: 3,
    hopStart: 3,
    payloadVariant: {
      case: "decoded",
      value: dataPacket,
    },
  });

  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "packet",
      value: meshPacket,
    },
  });
}

/**
 * Create a neighbor info packet
 */
export function createNeighborInfoPacket(
  from: number,
  neighbors: Array<{ nodeId: number; snr: number }>,
  id: number,
): Protobuf.Mesh.FromRadio {
  const neighborInfo = create(Protobuf.Mesh.NeighborInfoSchema, {
    nodeId: from,
    lastSentById: from,
    nodeBroadcastIntervalSecs: 900,
    neighbors: neighbors.map((n) =>
      create(Protobuf.Mesh.NeighborSchema, {
        nodeId: n.nodeId,
        snr: n.snr,
      }),
    ),
  });

  const dataPacket = create(Protobuf.Mesh.DataSchema, {
    portnum: Protobuf.Portnums.PortNum.NEIGHBORINFO_APP,
    payload: toBinary(Protobuf.Mesh.NeighborInfoSchema, neighborInfo),
  });

  const meshPacket = create(Protobuf.Mesh.MeshPacketSchema, {
    from,
    to: 0xffffffff, // broadcast
    channel: 0,
    id,
    rxTime: Math.floor(Date.now() / 1000),
    rxSnr: Math.random() * 10 - 2,
    rxRssi: Math.floor(-50 - Math.random() * 70),
    hopLimit: 3,
    hopStart: 3,
    payloadVariant: {
      case: "decoded",
      value: dataPacket,
    },
  });

  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "packet",
      value: meshPacket,
    },
  });
}
