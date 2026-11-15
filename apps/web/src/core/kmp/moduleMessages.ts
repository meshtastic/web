import type { Protobuf } from "@core/protobuf.ts";
import { DeviceStatusEnum, type MeshClient } from "@meshtastic/sdk";
import { signal } from "@preact/signals-core";
import type { Result } from "better-result";
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

const stores = new WeakMap<MeshClient, ModuleMessages>();

export function moduleMessagesFor(client: MeshClient): ModuleMessages {
  const existing = stores.get(client);
  if (existing) return existing;

  const cannedMessages = signal<string | undefined>(undefined);
  const ringtone = signal<string | undefined>(undefined);
  const listeners = new Set<(kind: ModuleMessageKind) => void>();

  client.events.onAdminPacket.subscribe((packet) => {
    if (packet.from !== client.myNodeNum) return;
    const variant = packet.data.payloadVariant;
    if (variant.case === "getCannedMessageModuleMessagesResponse") {
      cannedMessages.value = variant.value;
      for (const cb of listeners) cb("cannedMessages");
    } else if (variant.case === "getRingtoneResponse") {
      ringtone.value = variant.value;
      for (const cb of listeners) cb("ringtone");
    }
  });
  client.events.onDeviceStatus.subscribe((status) => {
    if (status === DeviceStatusEnum.DeviceDisconnected) {
      cannedMessages.value = undefined;
      ringtone.value = undefined;
    }
  });

  const store: ModuleMessages = {
    cannedMessages: toReadonly(cannedMessages),
    ringtone: toReadonly(ringtone),
    request: (kind) =>
      kind === "cannedMessages"
        ? client.config.requestCannedMessages()
        : client.config.requestRingtone(),
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
  stores.set(client, store);
  return store;
}
