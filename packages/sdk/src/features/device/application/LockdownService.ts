import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { sendAdminMessage } from "../infrastructure/AdminMessageSender.ts";

/** Boots an unlock stays valid for when the caller doesn't say. */
export const DEFAULT_UNLOCK_BOOTS = 50;

export interface UnlockOptions {
  passphrase: string;
  /** Reboots the unlock survives. Defaults to {@link DEFAULT_UNLOCK_BOOTS}. */
  bootsRemaining?: number;
  /** Hours until the unlock expires; 0 or unset means no time limit. */
  validForHours?: number;
  /** Per-boot session cap in seconds; 0 or unset means unlimited. */
  maxSessionSeconds?: number;
}

const LOCKED_STATES = new Set([
  Protobuf.Mesh.LockdownStatus_State.NEEDS_PROVISION,
  Protobuf.Mesh.LockdownStatus_State.LOCKED,
  Protobuf.Mesh.LockdownStatus_State.UNLOCK_FAILED,
]);

/** True while the device withholds its config until the client unlocks it. */
export const isLockedState = (
  status: Protobuf.Mesh.LockdownStatus | undefined,
): boolean => !!status && LOCKED_STATES.has(status.state);

function sendLockdownAuth(
  client: MeshClient,
  auth: Parameters<typeof create<typeof Protobuf.Admin.LockdownAuthSchema>>[1],
): Promise<number> {
  // LockdownAuth only works on the local node. Its outcome arrives as
  // FromRadio.lockdown_status, not as an admin response.
  return sendAdminMessage(
    client,
    {
      case: "lockdownAuth",
      value: create(Protobuf.Admin.LockdownAuthSchema, auth),
    },
    "self",
    undefined,
    true,
    false,
  );
}

export function unlock(client: MeshClient, options: UnlockOptions) {
  const hours = options.validForHours ?? 0;
  return sendLockdownAuth(client, {
    passphrase: new TextEncoder().encode(options.passphrase),
    bootsRemaining: Math.max(0, options.bootsRemaining ?? DEFAULT_UNLOCK_BOOTS),
    validUntilEpoch:
      hours > 0 ? Math.floor(Date.now() / 1000) + hours * 3600 : 0,
    maxSessionSeconds: Math.max(0, options.maxSessionSeconds ?? 0),
  });
}

export function lockNow(client: MeshClient) {
  return sendLockdownAuth(client, { lockNow: true });
}

/**
 * Turn lockdown off. Irreversible: the device decrypts its storage, removes
 * the passphrase and reboots out of lockdown.
 */
export function disableLockdown(client: MeshClient, passphrase: string) {
  return sendLockdownAuth(client, {
    passphrase: new TextEncoder().encode(passphrase),
    disable: true,
  });
}
