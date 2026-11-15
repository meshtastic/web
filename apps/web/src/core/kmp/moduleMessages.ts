import type { Protobuf } from "@core/protobuf.ts";
import { signal } from "@preact/signals-core";
import { Result } from "better-result";
import type { MeshSession } from "./session.ts";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

export type ModuleMessageKind = "cannedMessages" | "ringtone";

/**
 * Settings the device keeps outside ModuleConfig, each read and written
 * through its own admin message: the canned message list and the
 * External Notification ringtone.
 */
export interface ModuleMessages {
  cannedMessages: ReadonlySignal<string | undefined>;
  ringtone: ReadonlySignal<string | undefined>;
  request(kind: ModuleMessageKind): Promise<Result<unknown, Error>>;
  /** Fires when the device answers a request for `kind`. */
  onResponse(cb: (kind: ModuleMessageKind) => void): () => void;
  /** Records a value the device accepted in a commit. */
  applySent(message: Protobuf.Admin.AdminMessage): void;
}

const stores = new WeakMap<MeshSession, ModuleMessages>();

export function moduleMessagesFor(session: MeshSession): ModuleMessages {
  const existing = stores.get(session);
  if (existing) return existing;

  const cannedMessages = signal<string | undefined>(undefined);
  const ringtone = signal<string | undefined>(undefined);
  const listeners = new Set<(kind: ModuleMessageKind) => void>();
  const answered = (kind: ModuleMessageKind, value: string): void => {
    (kind === "cannedMessages" ? cannedMessages : ringtone).value = value;
    for (const cb of listeners) cb(kind);
  };

  session.events.onConnectionState.subscribe((state) => {
    if (state.kind === "disconnected") {
      cannedMessages.value = undefined;
      ringtone.value = undefined;
    }
  });

  const store: ModuleMessages = {
    cannedMessages: toReadonly(cannedMessages),
    ringtone: toReadonly(ringtone),
    request: async (kind) => {
      const result =
        kind === "cannedMessages"
          ? await session.config.requestCannedMessages()
          : await session.config.requestRingtone();
      if (Result.isOk(result)) answered(kind, result.value);
      return result;
    },
    onResponse: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    applySent: (message) => {
      const variant = message.payloadVariant;
      if (variant.case === "setCannedMessageModuleMessages") {
        cannedMessages.value = variant.value;
      } else if (variant.case === "setRingtoneMessage") {
        ringtone.value = variant.value;
      }
    },
  };
  stores.set(session, store);
  return store;
}
