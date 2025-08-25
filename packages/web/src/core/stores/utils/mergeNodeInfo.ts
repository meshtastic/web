import { create } from "@bufbuild/protobuf";
import type { NodeErrorType } from "@core/stores";
import { isEmptyKey, isSameKey } from "@core/utils/sameKey";
import { Protobuf } from "@meshtastic/core";

function assignDefined<T extends object, K extends keyof T = keyof T>(
  destination: T,
  source: Partial<T>,
  exclude?: readonly K[],
): T {
  const ex = new Set<keyof T>(exclude ?? []);
  for (const key of Object.keys(source) as Array<keyof T>) {
    if (ex.has(key)) {
      continue;
    }
    const val = source[key];
    if (val !== undefined) {
      destination[key] = val as T[typeof key];
    }
  }
  return destination;
}

export function mergeNodeInfo(
  oldNode: Protobuf.Mesh.NodeInfo,
  newNode: Protobuf.Mesh.NodeInfo,
  setNodeError: (nodeNum: number, error: NodeErrorType) => void,
): Protobuf.Mesh.NodeInfo {
  const merged = create(Protobuf.Mesh.NodeInfoSchema, oldNode);

  if (newNode.user !== undefined) {
    const oldKey = oldNode.user?.publicKey;
    const newKey = newNode.user.publicKey;
    const ok =
      isEmptyKey(newKey) ||
      (isEmptyKey(oldKey) && isEmptyKey(newKey)) ||
      (!isEmptyKey(oldKey) && !isEmptyKey(newKey) && isSameKey(oldKey, newKey));

    if (!ok) {
      setNodeError(merged.num, "MISMATCH_PKI");
      return merged; // drop all untrusted fields
    }

    const baseUser = oldNode.user
      ? create(Protobuf.Mesh.UserSchema, oldNode.user)
      : create(Protobuf.Mesh.UserSchema);
    merged.user = assignDefined<Protobuf.Mesh.User>(baseUser, newNode.user);
  }

  if (newNode.position !== undefined) {
    const basePosition = oldNode.position
      ? create(Protobuf.Mesh.PositionSchema, oldNode.position)
      : create(Protobuf.Mesh.PositionSchema);
    merged.position = assignDefined(basePosition, newNode.position);
  }

  if (newNode.deviceMetrics !== undefined) {
    const baseMetrics = oldNode.deviceMetrics
      ? create(Protobuf.Telemetry.DeviceMetricsSchema, oldNode.deviceMetrics)
      : create(Protobuf.Telemetry.DeviceMetricsSchema);
    merged.deviceMetrics = assignDefined(baseMetrics, newNode.deviceMetrics);
  }

  assignDefined(merged, newNode, [
    "user",
    "position",
    "deviceMetrics",
  ] as const);

  return merged;
}
