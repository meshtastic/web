import type {
  Connection,
  ConnectionStatus,
} from "@app/core/stores/deviceStore/types";
import type { ConnectionStateJs } from "@meshtastic/sdk-kmp";
import { t } from "i18next";

/**
 * How a connect failure is classified. The facade sets `error.name` to one
 * of the SDK's exception kinds; everything else is a plain transport error.
 */
export type ConnectErrorKind =
  | "lna-denied"
  | "lna-prompt"
  | "handshake-timeout"
  | "firmware-too-old"
  | "serial-busy"
  | "protocol"
  | "transport";

const ERROR_KINDS: ReadonlySet<string> = new Set<ConnectErrorKind>([
  "lna-denied",
  "lna-prompt",
  "handshake-timeout",
  "firmware-too-old",
  "serial-busy",
  "protocol",
  "transport",
]);

function isConnectErrorKind(name: string): name is ConnectErrorKind {
  return ERROR_KINDS.has(name);
}

export function connectErrorKind(error: unknown): ConnectErrorKind {
  if (error instanceof Error && isConnectErrorKind(error.name)) {
    return error.name;
  }
  return "transport";
}

export interface ConnectFailure {
  status: ConnectionStatus;
  error: string;
  errorKind: Connection["errorKind"];
}

/**
 * Saved-connection fields for a failed connect. A denied Local Network
 * Access permission is terminal (only the user can lift it); a pending
 * prompt means an automatic connect stopped short of prompting, so the
 * connection just stays disconnected until the user clicks Connect.
 */
export function connectFailure(error: unknown): ConnectFailure {
  const kind = connectErrorKind(error);
  const message = error instanceof Error ? error.message : String(error);
  switch (kind) {
    case "lna-denied":
      return {
        status: "error",
        error: t("connections:errors.localNetworkDenied"),
        errorKind: "lna-denied",
      };
    case "lna-prompt":
      return {
        status: "disconnected",
        error: t("connections:errors.localNetworkPrompt"),
        errorKind: "network",
      };
    case "handshake-timeout":
      return {
        status: "error",
        error: t("connections:errors.handshakeTimeout"),
        errorKind: "interrupted",
      };
    case "firmware-too-old":
      return { status: "error", error: message, errorKind: undefined };
    // Another tab, possibly on another site, or another app holds the port.
    case "serial-busy":
      return {
        status: "error",
        error: t("connections:errors.serialBusy"),
        errorKind: "busy",
      };
    default:
      return { status: "error", error: message, errorKind: "network" };
  }
}

/**
 * Maps the SDK's connection state onto the saved-connection status the
 * drawer and overlay render. `configuring` is the SDK handshake and
 * `connected` means it finished, which the app calls `configured`.
 */
export function toConnectionStatus(state: ConnectionStateJs): ConnectionStatus {
  switch (state.kind) {
    case "connecting":
    case "reconnecting":
      return "connecting";
    case "configuring":
      return "configuring";
    case "connected":
      return "configured";
    default:
      return "disconnected";
  }
}

/** The reconnect attempt the SDK is on, as `attempt/maxAttempts`, if any. */
export function reconnectAttempt(
  state: ConnectionStateJs,
): { attempt: number; maxAttempts: number } | undefined {
  if (state.kind !== "reconnecting") {
    return undefined;
  }
  return { attempt: state.attempt, maxAttempts: state.maxAttempts };
}
