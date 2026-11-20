import type { MeshSession } from "@core/kmp/session.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { useActiveClient, useSignal } from "@core/kmp/hooks";

type LockdownStatus = Protobuf.Mesh.LockdownStatus | undefined;

// Stable stand-ins so useSignal keeps the same subscription when no client
// is active (before the first connect, or in isolated component tests).
const NO_STATUS = {
  value: undefined as LockdownStatus,
  peek: () => undefined as LockdownStatus,
  subscribe: () => () => {},
};
const NOT_LOCKED = {
  value: false,
  peek: () => false,
  subscribe: () => () => {},
};

export interface UseLockdownResult {
  client: MeshSession | undefined;
  /** Latest lockdown status; undefined when the firmware has no lockdown. */
  status: LockdownStatus;
  /** True while the device withholds its config until it is unlocked. */
  isLocked: boolean;
}

/** Lockdown state of the active device. */
export function useLockdown(): UseLockdownResult {
  const client = useActiveClient();
  const status = useSignal(client?.device.lockdownStatus ?? NO_STATUS);
  const isLocked = useSignal(client?.device.isLocked ?? NOT_LOCKED);
  return { client, status, isLocked };
}
