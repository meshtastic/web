import type { Channel } from "@core/kmp/channels.ts";
import type { SendTextError, SendTextInput } from "@core/kmp/chat.ts";
import type { NodeError } from "@core/kmp/nodes.ts";
import type { ConnectionProgress } from "@core/kmp/session.ts";
import { constantSignal, type ReadonlySignal } from "@core/kmp/signals.ts";
import type { Protobuf, Types } from "@core/protobuf.ts";
import type { ConversationKey, Message, Node } from "@core/storage/types.ts";
import type { Result } from "better-result";
import { useCallback, useMemo } from "react";
import { useActiveClient } from "./registry.tsx";
import { useSignal } from "./useSignal.ts";

const NO_NODES = constantSignal<ReadonlyArray<Node>>([]);
const NO_ERRORS = constantSignal<ReadonlyArray<NodeError>>([]);
const NO_CHANNELS = constantSignal<ReadonlyArray<Channel>>([]);
const NO_MESSAGES = constantSignal<Message[]>([]);
const NO_TEXT = constantSignal("");
const ZERO = constantSignal(0);
const NO_UNREAD = constantSignal<ReadonlyMap<string, number>>(new Map());
const IDLE = constantSignal<ConnectionProgress>({ phase: "idle" });
const FALSE = constantSignal(false);
const NOTHING = constantSignal(undefined);

export function useNodes(): ReadonlyArray<Node> {
  const client = useActiveClient();
  return useSignal(client?.nodes.list ?? NO_NODES);
}

export function useNodeErrors(): ReadonlyArray<NodeError> {
  const client = useActiveClient();
  return useSignal(client?.nodes.errors ?? NO_ERRORS);
}

export function useNodeError(nodeNum: number): NodeError | undefined {
  return useNodeErrors().find((e) => e.node === nodeNum);
}

export function useHasNodeError(nodeNum: number): boolean {
  return useNodeError(nodeNum) !== undefined;
}

export function useChannels(): ReadonlyArray<Channel> {
  const client = useActiveClient();
  return useSignal(client?.channels.list ?? NO_CHANNELS);
}

export function useChannel(index: number): Channel | undefined {
  return useChannels().find((c) => c.index === index);
}

export interface UseChatResult {
  messages: Message[];
  send(input: SendTextInput): Promise<Result<number, SendTextError>>;
  loadOlder(before: Date, limit?: number): Promise<Message[]>;
}

function noClient(): never {
  throw new Error("No active connection");
}

function useConversation(conv: ConversationKey): UseChatResult {
  const client = useActiveClient();
  const id = conv.kind === "channel" ? conv.channel : conv.peer;
  const sig = useMemo<ReadonlySignal<Message[]>>(() => {
    if (!client) return NO_MESSAGES;
    return conv.kind === "channel"
      ? client.chat.messages(conv.channel)
      : client.chat.direct(conv.peer);
  }, [client, conv.kind, id]);
  const messages = useSignal(sig);
  const send = useCallback(
    (input: SendTextInput) => (client ? client.chat.send(input) : noClient()),
    [client],
  );
  const loadOlder = useCallback(
    (before: Date, limit?: number) =>
      client ? client.chat.loadOlder(conv, before, limit) : noClient(),
    [client, conv.kind, id],
  );
  return { messages, send, loadOlder };
}

export function useChat(channel: Types.ChannelNumber): UseChatResult {
  return useConversation({ kind: "channel", channel });
}

/** Direct messages with one peer; from-me-to-peer and from-peer-to-me share the bucket. */
export function useDirectChat(peer: number): UseChatResult {
  return useConversation({ kind: "direct", peer });
}

export interface UseDraftResult {
  text: string;
  setText(value: string): void;
  clear(): void;
}

export function useDraft(conv: ConversationKey): UseDraftResult {
  const client = useActiveClient();
  const id = conv.kind === "channel" ? conv.channel : conv.peer;
  const sig = useMemo(
    () => client?.chat.drafts.get(conv) ?? NO_TEXT,
    [client, conv.kind, id],
  );
  const text = useSignal(sig);
  const setText = useCallback(
    (value: string) => client?.chat.drafts.set(conv, value),
    [client, conv.kind, id],
  );
  const clear = useCallback(
    () => client?.chat.drafts.clear(conv),
    [client, conv.kind, id],
  );
  return { text, setText, clear };
}

export function useTotalUnread(): number {
  const client = useActiveClient();
  return useSignal(client?.chat.unread.total ?? ZERO);
}

export function useUnreadCount(key: ConversationKey): number {
  const client = useActiveClient();
  const id = key.kind === "channel" ? key.channel : key.peer;
  const sig = useMemo(
    () => client?.chat.unread.count(key) ?? ZERO,
    [client, key.kind, id],
  );
  return useSignal(sig);
}

export function useUnreadByKey(): ReadonlyMap<string, number> {
  const client = useActiveClient();
  return useSignal(client?.chat.unread.byKey ?? NO_UNREAD);
}

export interface UseMeshDeviceResult {
  status: Types.DeviceStatusEnum | undefined;
  isConfigured: boolean;
  myNodeNum: number | undefined;
  metadata: Protobuf.Mesh.DeviceMetadata | undefined;
}

export function useMeshDevice(): UseMeshDeviceResult {
  const client = useActiveClient();
  const status = useSignal(client?.device.status ?? NOTHING);
  const isConfigured = useSignal(client?.device.isConfigured ?? FALSE);
  const myNodeNum = useSignal(client?.device.myNodeNum ?? NOTHING);
  const metadata = useSignal(client?.device.metadata ?? NOTHING);
  return { status, isConfigured, myNodeNum, metadata };
}

/** True when the device's LoRa region is UNSET: freshly flashed, not transmitting. */
export function useIsRegionUnset(): boolean {
  const client = useActiveClient();
  return useSignal(client?.config.isRegionUnset ?? FALSE);
}

/** Handshake progress of the active connection; idle without one. */
export function useConnectionProgress(): ConnectionProgress {
  const client = useActiveClient();
  return useSignal(client?.progress ?? IDLE);
}
