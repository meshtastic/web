import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startDiagnosticsCapture } from "./capture.ts";
import { createLogBuffer, type LogEntry } from "./logBuffer.ts";
import { encodeLog, loadLog, PERSISTED_LOG_KEY } from "./persist.ts";

const entry = (n: number): LogEntry => ({
  time: n,
  level: "info",
  logger: "test",
  message: `line ${n}`,
});

describe("startDiagnosticsCapture", () => {
  let stop: () => void = () => {};

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    stop();
  });

  it("puts lines from before the reload ahead of a marker and new lines", () => {
    sessionStorage.setItem(PERSISTED_LOG_KEY, encodeLog([entry(1), entry(2)]));
    const buffer = createLogBuffer(10);
    buffer.push(entry(3));
    stop = startDiagnosticsCapture(buffer, window);
    expect(buffer.entries().map((e) => e.message)).toEqual([
      "line 1",
      "line 2",
      "page loaded; 2 lines kept from before the reload",
      "line 3",
    ]);
  });

  it("marks a fresh load", () => {
    const buffer = createLogBuffer(10);
    stop = startDiagnosticsCapture(buffer, window);
    expect(buffer.entries().map((e) => e.message)).toEqual(["page loaded"]);
  });

  it("saves the log when the page is hidden", () => {
    const buffer = createLogBuffer(10);
    stop = startDiagnosticsCapture(buffer, window);
    buffer.push(entry(4));
    window.dispatchEvent(new Event("pagehide"));
    expect(loadLog(sessionStorage).map((e) => e.message)).toEqual([
      "page loaded",
      "line 4",
    ]);
  });

  it("records uncaught errors with where they happened", () => {
    const buffer = createLogBuffer(10);
    stop = startDiagnosticsCapture(buffer, window);
    window.dispatchEvent(
      new ErrorEvent("error", {
        error: new TypeError("x is undefined"),
        filename: "app.js",
        lineno: 12,
        colno: 3,
      }),
    );
    expect(buffer.entries().at(-1)).toMatchObject({
      level: "error",
      logger: "diagnostics",
      message: "Uncaught TypeError: x is undefined at app.js:12:3",
    });
  });

  it("stops listening when stopped", () => {
    const buffer = createLogBuffer(10);
    startDiagnosticsCapture(buffer, window)();
    window.dispatchEvent(new ErrorEvent("error", { message: "late" }));
    expect(buffer.entries()).toHaveLength(1);
  });
});
