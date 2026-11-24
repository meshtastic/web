import type { Connection } from "@core/stores/deviceStore/types.ts";
import { describe, expect, it } from "vitest";
import type { LogEntry } from "./logBuffer.ts";
import {
  type DiagnosticsContext,
  diagnosticsFileName,
  formatDiagnostics,
  summarizeConnection,
} from "./report.ts";

const AT = Date.UTC(2026, 10, 23, 20, 5, 1, 123);

const httpConnection: Connection = {
  id: 1,
  type: "http",
  name: "Kitchen radio",
  url: "https://192.168.1.40:443",
  createdAt: 0,
  status: "error",
  error: "Handshake timed out during stage: Seeding Session",
};

const context: DiagnosticsContext = {
  generatedAt: AT,
  build: { version: "2.8.0", commit: "abcdef0123", shortCommit: "abcdef0" },
  userAgent: "Mozilla/5.0 Firefox/140.0",
  pageProtocol: "https:",
  connections: [summarizeConnection(httpConnection)],
};

const entry = (message: string): LogEntry => ({
  time: AT - 1000,
  level: "error",
  logger: "sdk",
  message,
});

describe("summarizeConnection", () => {
  it("keeps the scheme and port of an HTTP connection but not its name or host", () => {
    const summary = summarizeConnection(httpConnection);
    expect(summary).toEqual({
      type: "http",
      status: "error",
      errorKind: undefined,
      error: "Handshake timed out during stage: Seeding Session",
      scheme: "https",
      port: "443",
      lastConnectedAt: undefined,
    });
    expect(JSON.stringify(summary)).not.toContain("Kitchen");
    expect(JSON.stringify(summary)).not.toContain("192.168");
  });

  it("has no scheme or port for Bluetooth and serial", () => {
    const summary = summarizeConnection({
      id: 2,
      type: "serial",
      name: "USB",
      createdAt: 0,
      status: "configured",
      lastConnectedAt: AT,
    });
    expect(summary.scheme).toBeUndefined();
    expect(summary.port).toBeUndefined();
  });
});

describe("formatDiagnostics", () => {
  it("writes the header, the connections and the redacted log lines", () => {
    const text = formatDiagnostics(context, [
      entry("MeshEngine: Handshake timeout at stage Seeding Session"),
      entry("fetch https://192.168.1.40/api/v1/toradio failed"),
    ]);
    expect(text).toBe(
      [
        "Meshtastic web client diagnostics",
        "Generated: 2026-11-23T20:05:01.123Z",
        "App: 2.8.0 (commit abcdef0)",
        "Browser: Mozilla/5.0 Firefox/140.0",
        "Page: https:",
        "Radio: not connected",
        "Connections:",
        "  - http https port 443: error; error: Handshake timed out during stage: Seeding Session; never connected",
        "",
        "Log (2 lines, oldest first):",
        "2026-11-23T20:05:00.123Z ERROR [sdk] MeshEngine: Handshake timeout at stage Seeding Session",
        "2026-11-23T20:05:00.123Z ERROR [sdk] fetch https://<host>/api/v1/toradio failed",
        "",
      ].join("\n"),
    );
  });

  it("says unknown for missing build info and lists a connected radio", () => {
    const text = formatDiagnostics(
      {
        ...context,
        build: {
          version: undefined,
          commit: undefined,
          shortCommit: undefined,
        },
        connections: [],
        radio: { firmware: "2.8.2.1a2b3c4", nodeCount: 231 },
      },
      [],
    );
    expect(text).toContain("App: unknown\n");
    expect(text).toContain(
      "Radio: firmware 2.8.2.1a2b3c4, hardware unknown, 231 nodes\n",
    );
    expect(text).toContain("Connections:\n  (none)\n");
    expect(text).toContain("Log (0 lines, oldest first):");
    expect(text).not.toContain("undefined");
  });

  it("redacts addresses inside a connection's error", () => {
    const text = formatDiagnostics(
      {
        ...context,
        connections: [
          summarizeConnection({
            ...httpConnection,
            errorKind: "network",
            error: "Could not reach 192.168.1.40",
          }),
        ],
      },
      [],
    );
    expect(text).toContain("error (network); error: Could not reach <ip>;");
  });
});

describe("diagnosticsFileName", () => {
  it("uses a filesystem-safe timestamp", () => {
    expect(diagnosticsFileName(AT)).toBe(
      "meshtastic-diagnostics-2026-11-23T20-05-01-123Z.txt",
    );
  });
});
