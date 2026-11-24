import { type Span as OtelSpan, SpanStatusCode } from "@opentelemetry/api";
import { FetchInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/fetch";
import { JsonTraceSerializer } from "@opentelemetry/otlp-transformer";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  type ReadableSpan,
  type Span,
  type SpanProcessor,
  TracerProvider,
} from "@opentelemetry/sdk-trace";
import { BUILD_INFO } from "@core/utils/buildInfo.ts";
import { createRingBuffer, type RingBuffer } from "./logBuffer.ts";
import { redactText } from "./redact.ts";
import type { SpanSummary } from "./spanReport.ts";

/** How many finished spans "Download traces" can include. */
const TRACE_CAPACITY = 1000;

const FETCH_SCOPE = "@opentelemetry/browser-instrumentation/fetch";

/** Only requests to a radio are kept, not map tiles or app assets. */
const RADIO_PATH = /^\/(api\/v1|json)\//;

/** The path of a URL whose host may already be redacted. */
function pathOf(url: string): string | undefined {
  return /^[a-z]+:\/\/[^/?#]*(\/[^?#]*)?/i.exec(url)?.[1] ?? undefined;
}

function urlOf(span: ReadableSpan): string | undefined {
  const url = span.attributes["url.full"];
  return typeof url === "string" ? url : undefined;
}

const hrTimeToMs = ([seconds, nanos]: readonly [number, number]) =>
  seconds * 1000 + nanos / 1e6;

/**
 * Keeps recent spans in `buffer`. String attributes are redacted as the span
 * ends, so no address is ever held, and only radio requests are kept from
 * the fetch instrumentation.
 */
export function createRecentSpansProcessor(
  buffer: RingBuffer<ReadableSpan>,
): SpanProcessor {
  return {
    onStart() {},
    onEnding(span: Span) {
      for (const [key, value] of Object.entries(span.attributes)) {
        if (key === "server.address") span.setAttribute(key, "<host>");
        else if (typeof value === "string")
          span.setAttribute(key, redactText(value));
      }
    },
    onEnd(span) {
      if (span.instrumentationScope.name !== FETCH_SCOPE) {
        buffer.push(span);
        return;
      }
      const path = pathOf(urlOf(span) ?? "");
      if (path && RADIO_PATH.test(path)) buffer.push(span);
    },
    forceFlush: () => Promise.resolve(),
    shutdown: () => Promise.resolve(),
  };
}

const recent = createRingBuffer<ReadableSpan>(TRACE_CAPACITY);

const provider = new TracerProvider({
  resource: resourceFromAttributes({
    "service.name": "meshtastic-web",
    "service.version": BUILD_INFO.version ?? "unknown",
  }),
  spanProcessors: [createRecentSpansProcessor(recent)],
});

/** The app's tracer. The provider is not registered globally. */
export const diagnosticsTracer = provider.getTracer("meshtastic-web");

/** Spans every radio HTTP request. Returns a function that stops it. */
export function startTracing(): () => void {
  const fetches = new FetchInstrumentation({ sanitizeUrl: redactText });
  // No propagator is passed and none is registered globally, so the
  // instrumentation adds no trace headers to requests sent to a radio.
  fetches.enable({ tracerProvider: provider });
  return () => fetches.disable();
}

/** Finished spans, oldest first. */
export const recentSpans = (): ReadableSpan[] => recent.entries();

export function toSpanSummary(span: ReadableSpan): SpanSummary {
  const url = urlOf(span);
  const status = span.attributes["http.response.status_code"];
  const errorType = span.attributes["error.type"];
  return {
    name: span.name,
    startMs: hrTimeToMs(span.startTime),
    durationMs: hrTimeToMs(span.duration),
    path: url === undefined ? undefined : pathOf(url),
    httpStatus: typeof status === "number" ? status : undefined,
    error:
      span.status.code === SpanStatusCode.ERROR
        ? (span.status.message ??
          (typeof errorType === "string" ? errorType : "error"))
        : undefined,
  };
}

/** `spans` as an OTLP/JSON export request, which Jaeger and Tempo import. */
export function spansToOtlpJson(spans: ReadableSpan[]): string {
  const bytes = JsonTraceSerializer.serializeRequest(spans);
  return bytes ? new TextDecoder().decode(bytes) : "{}";
}

/** Ends `span`, marking it failed with `error`, redacted, when there is one. */
export function endSpan(span: OtelSpan, error?: string): void {
  if (error !== undefined) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: redactText(error) });
  }
  span.end();
}
