import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import {
  type NodeRow,
  type NodeRowContext,
  type NodeSource,
  toNodeRow,
} from "./nodeRow.ts";

/** Test fixtures for the node view-model modules. */

export const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);

export interface NodeSpec {
  num: number;
  longName?: string;
  shortName?: string;
  hwModel?: Protobuf.Mesh.HardwareModel;
  role?: Protobuf.Config.Config_DeviceConfig_Role;
  /** Seconds before NOW; omit for never heard. */
  heardSecondsAgo?: number;
  snr?: number;
  hopsAway?: number;
  viaMqtt?: boolean;
  isFavorite?: boolean;
  isIgnored?: boolean;
  /** Degrees. */
  lat?: number;
  lng?: number;
  /** Metres; only with lat/lng. */
  altitude?: number;
  batteryLevel?: number;
  voltage?: number;
  publicKey?: Uint8Array;
  isUnmessagable?: boolean;
  heardOnCurrentLora?: boolean;
  status?: string;
}

export const makeNode = (spec: NodeSpec): NodeSource & { status?: string } => {
  const info = create(Protobuf.Mesh.NodeInfoSchema, {
    num: spec.num,
    user:
      spec.longName !== undefined || spec.shortName !== undefined
        ? create(Protobuf.Mesh.UserSchema, {
            longName: spec.longName ?? "",
            shortName: spec.shortName ?? "",
            hwModel: spec.hwModel ?? Protobuf.Mesh.HardwareModel.UNSET,
            role: spec.role ?? Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
            publicKey: spec.publicKey ?? new Uint8Array(),
            isUnmessagable: spec.isUnmessagable,
          })
        : undefined,
    position:
      spec.lat !== undefined && spec.lng !== undefined
        ? create(Protobuf.Mesh.PositionSchema, {
            latitudeI: Math.round(spec.lat * 1e7),
            longitudeI: Math.round(spec.lng * 1e7),
            altitude: spec.altitude,
          })
        : undefined,
    deviceMetrics:
      spec.batteryLevel !== undefined || spec.voltage !== undefined
        ? create(Protobuf.Telemetry.DeviceMetricsSchema, {
            batteryLevel: spec.batteryLevel,
            voltage: spec.voltage,
          })
        : undefined,
    snr: spec.snr ?? 0,
    lastHeard:
      spec.heardSecondsAgo === undefined
        ? 0
        : Math.floor(NOW / 1000) - spec.heardSecondsAgo,
    viaMqtt: spec.viaMqtt ?? false,
    hopsAway: spec.hopsAway,
    isFavorite: spec.isFavorite ?? false,
    isIgnored: spec.isIgnored ?? false,
    heardOnCurrentLora: spec.heardOnCurrentLora ?? true,
  });
  return spec.status === undefined ? info : { ...info, status: spec.status };
};

export const testContext = (
  overrides: Partial<NodeRowContext> = {},
): NodeRowContext => ({
  now: NOW,
  fallbackName: (suffix) => `Meshtastic ${suffix}`,
  ...overrides,
});

export const makeRow = (
  spec: NodeSpec,
  ctx: Partial<NodeRowContext> = {},
): NodeRow => toNodeRow(makeNode(spec), testContext(ctx));
