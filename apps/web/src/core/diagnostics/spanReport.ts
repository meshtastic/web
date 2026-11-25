/** What the text report needs from a finished span. */
export interface SpanSummary {
  readonly name: string;
  /** Epoch milliseconds. */
  readonly startMs: number;
  readonly durationMs: number;
  /** Request path for an HTTP span, e.g. `/api/v1/fromradio`. */
  readonly path?: string;
  /** HTTP status, or 0 when the request never got a response. */
  readonly httpStatus?: number;
  /** Set when the span ended in error. */
  readonly error?: string;
}

/** A request slower than this is listed on its own. */
export const SLOW_REQUEST_MS = 2000;

/** How many slow or failed requests the report lists. */
const MAX_LISTED = 20;

const failed = (span: SpanSummary) =>
  span.error !== undefined ||
  (span.httpStatus !== undefined &&
    (span.httpStatus === 0 || span.httpStatus >= 400));

function median(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return upper;
  return ((sorted[mid - 1] ?? upper) + upper) / 2;
}

const ms = (value: number) => `${Math.round(value)}ms`;

function describe(span: SpanSummary): string {
  const target = span.path ? `${span.name} ${span.path}` : span.name;
  const outcome = [
    span.httpStatus !== undefined ? `status ${span.httpStatus}` : undefined,
    span.error,
  ]
    .filter((part) => part !== undefined)
    .join(", ");
  return `${new Date(span.startMs).toISOString()} ${target} ${ms(span.durationMs)}${outcome ? ` (${outcome})` : ""}`;
}

/**
 * Text lines for the diagnostics report: every connect attempt, timing per
 * request type, then the slowest or failed requests, newest last.
 */
export function formatSpanReport(spans: readonly SpanSummary[]): string[] {
  const requests = spans.filter((span) => span.path !== undefined);
  const others = spans.filter((span) => span.path === undefined);

  const groups = new Map<string, SpanSummary[]>();
  for (const span of requests) {
    const key = `${span.name} ${span.path}`;
    groups.set(key, [...(groups.get(key) ?? []), span]);
  }

  const listed = requests
    .filter((span) => failed(span) || span.durationMs >= SLOW_REQUEST_MS)
    .slice(-MAX_LISTED);

  return [
    `Traces (${spans.length} spans):`,
    ...(others.length > 0
      ? others.map((span) => `  ${describe(span)}`)
      : ["  (no connect attempts)"]),
    "Requests:",
    ...(groups.size > 0
      ? [...groups].map(([key, group]) => {
          const times = group.map((s) => s.durationMs).sort((a, b) => a - b);
          const errors = group.filter(failed).length;
          return `  ${key}: ${group.length} sent, ${errors} failed, median ${ms(median(times))}, max ${ms(times.at(-1) ?? 0)}`;
        })
      : ["  (none)"]),
    `Slow (over ${ms(SLOW_REQUEST_MS)}) or failed requests:`,
    ...(listed.length > 0
      ? listed.map((span) => `  ${describe(span)}`)
      : ["  (none)"]),
  ];
}
