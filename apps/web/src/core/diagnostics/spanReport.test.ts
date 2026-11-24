import { describe, expect, it } from "vitest";
import { formatSpanReport, type SpanSummary } from "./spanReport.ts";

const AT = Date.UTC(2026, 10, 23, 20, 0, 0);

const request = (
  durationMs: number,
  extra: Partial<SpanSummary> = {},
): SpanSummary => ({
  name: "GET",
  path: "/api/v1/fromradio",
  startMs: AT,
  durationMs,
  httpStatus: 200,
  ...extra,
});

describe("formatSpanReport", () => {
  it("lists connect attempts, timing per request type, and slow or failed requests", () => {
    expect(
      formatSpanReport([
        { name: "connect", startMs: AT, durationMs: 5012 },
        request(100),
        request(300),
        request(2500),
        request(40, { name: "PUT", path: "/api/v1/toradio" }),
        request(10000, { httpStatus: 0, error: "Failed to fetch" }),
      ]),
    ).toEqual([
      "Traces (6 spans):",
      "  2026-11-23T20:00:00.000Z connect 5012ms",
      "Requests:",
      "  GET /api/v1/fromradio: 4 sent, 1 failed, median 1400ms, max 10000ms",
      "  PUT /api/v1/toradio: 1 sent, 0 failed, median 40ms, max 40ms",
      "Slow (over 2000ms) or failed requests:",
      "  2026-11-23T20:00:00.000Z GET /api/v1/fromradio 2500ms (status 200)",
      "  2026-11-23T20:00:00.000Z GET /api/v1/fromradio 10000ms (status 0, Failed to fetch)",
    ]);
  });

  it("shows a failed connect attempt with its error", () => {
    expect(
      formatSpanReport([
        {
          name: "connect",
          startMs: AT,
          durationMs: 10000,
          error: "Handshake timed out",
        },
      ]),
    ).toContain(
      "  2026-11-23T20:00:00.000Z connect 10000ms (Handshake timed out)",
    );
  });

  it("says when there is nothing to show", () => {
    expect(formatSpanReport([])).toEqual([
      "Traces (0 spans):",
      "  (no connect attempts)",
      "Requests:",
      "  (none)",
      "Slow (over 2000ms) or failed requests:",
      "  (none)",
    ]);
  });
});
