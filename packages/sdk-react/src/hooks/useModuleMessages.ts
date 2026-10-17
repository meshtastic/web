import type { MeshClient, Protobuf, ReadonlySignal } from "@meshtastic/sdk";
import { Result } from "better-result";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useOptionalMeshRegistry } from "../adapters/useMeshRegistry.ts";
import { useSignal } from "../adapters/useSignal.ts";
import { MeshContext } from "../provider/MeshContext.ts";

/** How long to wait for the device to answer before giving up. */
export const MODULE_MESSAGES_TIMEOUT_MS = 15_000;

export interface UseModuleMessagesResult {
  /** The device's value, or undefined until it has answered once. */
  value: string | undefined;
  /** A request is out and the device hasn't answered it yet. */
  isLoading: boolean;
  /** The request couldn't be sent, or the device didn't answer in time. */
  error: Error | undefined;
  /** Ask the device again. */
  refresh: () => void;
}

const EMPTY_STRING_SIGNAL: ReadonlySignal<string | undefined> = {
  value: undefined,
  peek: () => undefined,
  subscribe: () => () => {},
};

const EMPTY_CLIENT_SIGNAL: ReadonlySignal<MeshClient | undefined> = {
  value: undefined,
  peek: () => undefined,
  subscribe: () => () => {},
};

type ResponseCase = Extract<
  Protobuf.Admin.AdminMessage["payloadVariant"]["case"],
  "getCannedMessageModuleMessagesResponse" | "getRingtoneResponse"
>;

interface Source {
  signal: (client: MeshClient) => ReadonlySignal<string | undefined>;
  request: (client: MeshClient) => Promise<Result<number, Error>>;
  responseCase: ResponseCase;
}

/** The nearest MeshProvider client, else the registry's active one, if any. */
function useOptionalClient(): MeshClient | undefined {
  const direct = useContext(MeshContext);
  const registry = useOptionalMeshRegistry();
  const active = useSignal(registry?.active ?? EMPTY_CLIENT_SIGNAL);
  return direct ?? active;
}

function useModuleMessages(source: Source): UseModuleMessagesResult {
  const client = useOptionalClient();
  const value = useSignal(client ? source.signal(client) : EMPTY_STRING_SIGNAL);
  // Loading from the first render, since the request goes out on mount.
  const [isLoading, setIsLoading] = useState(client !== undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sourceRef = useRef(source);

  const stopWaiting = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setIsLoading(false);
  }, []);

  // The answer may repeat the cached value, so wait on the packet rather
  // than on the signal changing.
  useEffect(() => {
    if (!client) return;
    return client.events.onAdminPacket.subscribe((packet) => {
      if (packet.from !== client.myNodeNum) return;
      if (packet.data.payloadVariant.case !== sourceRef.current.responseCase) {
        return;
      }
      setError(undefined);
      stopWaiting();
    });
  }, [client, stopWaiting]);

  const refresh = useCallback(() => {
    if (!client) return;
    clearTimeout(timer.current);
    setIsLoading(true);
    setError(undefined);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setIsLoading(false);
      setError(new Error("The device did not answer"));
    }, MODULE_MESSAGES_TIMEOUT_MS);
    sourceRef.current.request(client).then((result) => {
      if (Result.isError(result)) {
        setError(result.error);
        stopWaiting();
      }
    });
  }, [client, stopWaiting]);

  useEffect(() => {
    refresh();
    return () => clearTimeout(timer.current);
  }, [refresh]);

  return { value, isLoading, error, refresh };
}

const CANNED_MESSAGES: Source = {
  signal: (client) => client.config.cannedMessages,
  request: (client) => client.config.requestCannedMessages(),
  responseCase: "getCannedMessageModuleMessagesResponse",
};

const RINGTONE: Source = {
  signal: (client) => client.config.ringtone,
  request: (client) => client.config.requestRingtone(),
  responseCase: "getRingtoneResponse",
};

/**
 * The connected device's `|`-separated canned message list. Asks the device
 * for it on mount. Returns an undefined value when no client is active.
 */
export function useCannedMessages(): UseModuleMessagesResult {
  return useModuleMessages(CANNED_MESSAGES);
}

/**
 * The connected device's External Notification ringtone (RTTTL). Asks the
 * device for it on mount. Returns an undefined value when no client is active.
 */
export function useRingtone(): UseModuleMessagesResult {
  return useModuleMessages(RINGTONE);
}
