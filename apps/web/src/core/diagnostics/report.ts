import type { Connection } from "@core/stores/deviceStore/types.ts";
import type { BuildInfo } from "@core/utils/buildInfo.ts";
import type { LogEntry } from "./logBuffer.ts";
import { redactText } from "./redact.ts";
import { formatSpanReport, type SpanSummary } from "./spanReport.ts";

/** What a diagnostics file says about one saved connection; no names or hosts. */
export interface ConnectionSummary {
  readonly type: Connection["type"];
  readonly status: Connection["status"];
  readonly errorKind?: Connection["errorKind"];
  readonly error?: string;
  /** `http` or `https`, for HTTP connections. */
  readonly scheme?: string;
  readonly port?: string;
  readonly lastConnectedAt?: number;
}

export interface RadioSummary {
  readonly firmware?: string;
  readonly hardware?: string;
  readonly nodeCount?: number;
}

export interface DiagnosticsContext {
  /** Epoch milliseconds. */
  readonly generatedAt: number;
  readonly build: BuildInfo;
  readonly userAgent: string;
  /** The page's own protocol, e.g. `https:`. */
  readonly pageProtocol: string;
  readonly connections: readonly ConnectionSummary[];
  /** The connected radio, when there is one. */
  readonly radio?: RadioSummary;
  /** Recent connect attempts and radio requests, when tracing is on. */
  readonly spans?: readonly SpanSummary[];
}

const URL_PARTS = /^([a-z][\w+.-]*):\/\/(?:\[[^\]]*\]|[^/:?#]*)(?::(\d+))?/i;

export function summarizeConnection(connection: Connection): ConnectionSummary {
  const parts =
    connection.type === "http" ? URL_PARTS.exec(connection.url) : null;
  return {
    type: connection.type,
    status: connection.status,
    errorKind: connection.errorKind,
    error: connection.error,
    scheme: parts?.[1]?.toLowerCase(),
    port: parts?.[2],
    lastConnectedAt: connection.lastConnectedAt,
  };
}

const iso = (ms: number): string => new Date(ms).toISOString();

const orUnknown = (value: string | undefined): string => value ?? "unknown";

function appLine(build: BuildInfo): string {
  const version = orUnknown(build.version);
  return build.shortCommit
    ? `${version} (commit ${build.shortCommit})`
    : version;
}

function radioLine(radio: RadioSummary | undefined): string {
  if (!radio) return "not connected";
  const parts = [
    `firmware ${orUnknown(radio.firmware)}`,
    `hardware ${orUnknown(radio.hardware)}`,
  ];
  if (radio.nodeCount !== undefined) parts.push(`${radio.nodeCount} nodes`);
  return parts.join(", ");
}

function connectionLine(connection: ConnectionSummary): string {
  const transport = [
    connection.type,
    connection.scheme,
    connection.port ? `port ${connection.port}` : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(" ");
  const status = connection.errorKind
    ? `${connection.status} (${connection.errorKind})`
    : connection.status;
  const details = [
    connection.error ? `error: ${redactText(connection.error)}` : undefined,
    connection.lastConnectedAt === undefined
      ? "never connected"
      : `last connected ${iso(connection.lastConnectedAt)}`,
  ].filter((part) => part !== undefined);
  return `  - ${transport}: ${status}; ${details.join("; ")}`;
}

export function formatLogLine(entry: LogEntry): string {
  return `${iso(entry.time)} ${entry.level.toUpperCase().padEnd(5)} [${entry.logger}] ${redactText(entry.message)}`;
}

/**
 * The text of a diagnostics file: what the app, browser and radio were,
 * request timings when there are spans, then the captured log lines, oldest first, with addresses, positions and
 * key-like values masked.
 */
export function formatDiagnostics(
  context: DiagnosticsContext,
  entries: readonly LogEntry[],
): string {
  const connections =
    context.connections.length > 0
      ? context.connections.map(connectionLine)
      : ["  (none)"];
  return [
    "Meshtastic web client diagnostics",
    `Generated: ${iso(context.generatedAt)}`,
    `App: ${appLine(context.build)}`,
    `Browser: ${context.userAgent || "unknown"}`,
    `Page: ${context.pageProtocol || "unknown"}`,
    `Radio: ${radioLine(context.radio)}`,
    "Connections:",
    ...connections,
    "",
    ...(context.spans ? [...formatSpanReport(context.spans), ""] : []),
    `Log (${entries.length} lines, oldest first):`,
    ...entries.map(formatLogLine),
    "",
  ].join("\n");
}

/** e.g. `meshtastic-diagnostics-2026-11-23T20-05-01-123Z.txt`. */
export function diagnosticsFileName(generatedAt: number): string {
  return `meshtastic-diagnostics-${iso(generatedAt).replace(/[:.]/g, "-")}.txt`;
}

export function tracesFileName(generatedAt: number): string {
  return `meshtastic-traces-${iso(generatedAt).replace(/[:.]/g, "-")}.json`;
}
