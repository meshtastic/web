import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";

export interface MockNodeOptions {
  nodeNum: number;
  shortName?: string;
  longName?: string;
  hwModel?: Protobuf.Mesh.HardwareModel;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  batteryLevel?: number;
  voltage?: number;
  channelUtilization?: number;
  airUtilTx?: number;
  snr?: number;
  lastHeard?: number;
  hopsAway?: number;
}

/**
 * Generate a mock node info packet
 */
export function generateNodeInfo(
  options: MockNodeOptions,
): Protobuf.Mesh.NodeInfo {
  const nodeNumHex = options.nodeNum
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");
  const last4 = nodeNumHex.slice(-4);

  return create(Protobuf.Mesh.NodeInfoSchema, {
    num: options.nodeNum,
    snr: options.snr ?? Math.random() * 10 - 2, // -2 to 8 dB
    lastHeard:
      options.lastHeard ??
      Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 600),
    hopsAway: options.hopsAway ?? Math.floor(Math.random() * 4),
    user: create(Protobuf.Mesh.UserSchema, {
      id: `!${nodeNumHex.toLowerCase()}`,
      shortName: options.shortName ?? last4,
      longName: options.longName ?? `Meshtastic ${last4}`,
      hwModel: options.hwModel ?? Protobuf.Mesh.HardwareModel.TBEAM,
      isLicensed: false,
      role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
      publicKey: new Uint8Array(32),
    }),
    position:
      options.latitude !== undefined
        ? create(Protobuf.Mesh.PositionSchema, {
            latitudeI: Math.round((options.latitude ?? 0) * 1e7),
            longitudeI: Math.round((options.longitude ?? 0) * 1e7),
            altitude: options.altitude ?? 0,
            time: Math.floor(Date.now() / 1000),
            locationSource: Protobuf.Mesh.Position_LocSource.LOC_INTERNAL,
            altitudeSource: Protobuf.Mesh.Position_AltSource.ALT_INTERNAL,
            satsInView: 8,
            precisionBits: 32,
          })
        : undefined,
    deviceMetrics: create(Protobuf.Telemetry.DeviceMetricsSchema, {
      batteryLevel: options.batteryLevel ?? Math.floor(Math.random() * 100),
      voltage: options.voltage ?? 3.7 + Math.random() * 0.5,
      channelUtilization: options.channelUtilization ?? Math.random() * 30,
      airUtilTx: options.airUtilTx ?? Math.random() * 10,
      uptimeSeconds: Math.floor(Math.random() * 86400),
    }),
  });
}

/**
 * Create a FromRadio wrapper for nodeInfo
 */
export function createNodeInfoPacket(
  nodeInfo: Protobuf.Mesh.NodeInfo,
  id: number,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "nodeInfo",
      value: nodeInfo,
    },
  });
}

/**
 * Generate a set of mock nodes for a mesh network
 */
export function generateMeshNodes(
  count: number,
  centerLat = 37.7749,
  centerLon = -122.4194,
  radiusKm = 5,
): MockNodeOptions[] {
  const nodes: MockNodeOptions[] = [];
  const names = [
    "Alpha",
    "Bravo",
    "Charlie",
    "Delta",
    "Echo",
    "Foxtrot",
    "Golf",
    "Hotel",
    "India",
    "Juliet",
    "Kilo",
    "Lima",
    "Mike",
    "November",
    "Oscar",
    "Papa",
    "Quebec",
    "Romeo",
    "Sierra",
    "Tango",
    "Uniform",
    "Victor",
    "Whiskey",
    "X-ray",
    "Yankee",
    "Zulu",
  ];

  const hwModels = [
    Protobuf.Mesh.HardwareModel.TBEAM,
    Protobuf.Mesh.HardwareModel.TLORA_V2,
    Protobuf.Mesh.HardwareModel.HELTEC_V3,
    Protobuf.Mesh.HardwareModel.RAK4631,
    Protobuf.Mesh.HardwareModel.STATION_G1,
  ];

  for (let i = 0; i < count; i++) {
    // Random position within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;
    const latOffset = (distance / 111) * Math.cos(angle);
    const lonOffset =
      (distance / (111 * Math.cos((centerLat * Math.PI) / 180))) *
      Math.sin(angle);

    const nodeNum = 0x12340000 + i + 1;
    const name = names[i % names.length];

    nodes.push({
      nodeNum,
      shortName: name?.slice(0, 4) ?? `N${i}`,
      longName: `${name} Node`,
      hwModel: hwModels[i % hwModels.length],
      latitude: centerLat + latOffset,
      longitude: centerLon + lonOffset,
      altitude: Math.floor(Math.random() * 500) + 10,
      batteryLevel: Math.floor(Math.random() * 100),
      voltage: 3.5 + Math.random() * 0.7,
      channelUtilization: Math.random() * 25,
      airUtilTx: Math.random() * 8,
      hopsAway: Math.floor(Math.random() * 4),
    });
  }

  return nodes;
}
