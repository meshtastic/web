import { type ReadableSpan, TracerProvider } from "@opentelemetry/sdk-trace";
import { describe, expect, it } from "vitest";
import { createRingBuffer } from "./logBuffer.ts";
import {
  createRecentSpansProcessor,
  endSpan,
  spansToOtlpJson,
  toSpanSummary,
} from "./tracing.ts";

const FETCH_SCOPE = "@opentelemetry/browser-instrumentation/fetch";

function setup() {
  const buffer = createRingBuffer<ReadableSpan>(10);
  const provider = new TracerProvider({
    spanProcessors: [createRecentSpansProcessor(buffer)],
  });
  return { buffer, provider };
}

describe("createRecentSpansProcessor", () => {
  it("keeps radio requests with their address redacted", () => {
    const { buffer, provider } = setup();
    provider
      .getTracer(FETCH_SCOPE)
      .startSpan("GET", {
        attributes: {
          "url.full": "http://192.168.1.40/api/v1/fromradio?all=false",
          "server.address": "kitchen-radio",
          "http.response.status_code": 200,
        },
      })
      .end();
    const [span] = buffer.entries();
    expect(span?.attributes).toMatchObject({
      "url.full": "http://<host>/api/v1/fromradio?all=false",
      "server.address": "<host>",
      "http.response.status_code": 200,
    });
  });

  it("drops other fetches, such as map tiles", () => {
    const { buffer, provider } = setup();
    provider
      .getTracer(FETCH_SCOPE)
      .startSpan("GET", {
        attributes: { "url.full": "https://tiles.example.org/3/2/1.pbf" },
      })
      .end();
    expect(buffer.entries()).toHaveLength(0);
  });

  it("keeps the app's own spans", () => {
    const { buffer, provider } = setup();
    provider.getTracer("meshtastic-web").startSpan("connect").end();
    expect(buffer.entries().map((s) => s.name)).toEqual(["connect"]);
  });
});

describe("endSpan and toSpanSummary", () => {
  it("records a redacted failure", () => {
    const { buffer, provider } = setup();
    endSpan(
      provider.getTracer("meshtastic-web").startSpan("connect"),
      "Could not reach 192.168.1.40",
    );
    const [span] = buffer.entries();
    expect(span && toSpanSummary(span)).toMatchObject({
      name: "connect",
      error: "Could not reach <ip>",
      path: undefined,
    });
  });

  it("summarizes a request's path and status", () => {
    const { buffer, provider } = setup();
    provider
      .getTracer(FETCH_SCOPE)
      .startSpan("PUT", {
        attributes: {
          "url.full": "https://10.0.0.2:9443/api/v1/toradio",
          "http.response.status_code": 503,
        },
      })
      .end();
    const [span] = buffer.entries();
    expect(span && toSpanSummary(span)).toMatchObject({
      name: "PUT",
      path: "/api/v1/toradio",
      httpStatus: 503,
      error: undefined,
    });
  });
});

describe("spansToOtlpJson", () => {
  it("writes an OTLP export request", () => {
    const { buffer, provider } = setup();
    provider.getTracer("meshtastic-web").startSpan("connect").end();
    const parsed: unknown = JSON.parse(spansToOtlpJson(buffer.entries()));
    expect(parsed).toMatchObject({
      resourceSpans: [
        {
          scopeSpans: [
            {
              scope: { name: "meshtastic-web" },
              spans: [{ name: "connect" }],
            },
          ],
        },
      ],
    });
  });
});
