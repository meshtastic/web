import { create, type MessageInitShape } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  type DeviceLogEntry,
  filterLogEntries,
  formatLogEntry,
} from "./logRecords.ts";

const entry = (
  id: number,
  init: MessageInitShape<typeof Protobuf.Mesh.LogRecordSchema>,
): DeviceLogEntry => ({
  id,
  receivedAt: Date.UTC(2026, 0, 2, 3, 4, 5),
  record: create(Protobuf.Mesh.LogRecordSchema, init),
});

describe("log records", () => {
  it("formats with the node's time when set", () => {
    expect(
      formatLogEntry(
        entry(1, {
          time: Date.UTC(2026, 0, 1) / 1000,
          level: Protobuf.Mesh.LogRecord_Level.WARNING,
          source: "Router",
          message: "queue full",
        }),
      ),
    ).toBe("2026-01-01T00:00:00.000Z [WARNING] Router: queue full");
  });

  it("falls back to the arrival time", () => {
    expect(formatLogEntry(entry(1, { message: "hi" }))).toBe(
      "2026-01-02T03:04:05.000Z [UNSET] hi",
    );
  });

  it("filters case-insensitively", () => {
    const entries = [
      entry(1, { message: "GPS lock" }),
      entry(2, { message: "radio idle" }),
    ];
    expect(filterLogEntries(entries, "gps").map((e) => e.id)).toEqual([1]);
    expect(filterLogEntries(entries, "  ")).toHaveLength(2);
  });
});
