import type { LogBuffer, LogEntry } from "./logBuffer.ts";
import { loadLog, saveLog } from "./persist.ts";
import { serializeLogArgs } from "./serialize.ts";

const LOGGER = "diagnostics";

function line(level: LogEntry["level"], message: string): LogEntry {
  return { time: Date.now(), level, logger: LOGGER, message };
}

function sessionStorageOf(target: Window): Storage | undefined {
  try {
    return target.sessionStorage;
  } catch {
    // Access throws when site data is blocked.
    return undefined;
  }
}

/**
 * Feeds the page's own events into `buffer`: the lines saved before a
 * reload, a marker for the reload itself, and uncaught errors and promise
 * rejections. The log is saved to sessionStorage whenever the page is hidden
 * or unloaded, so a tester who reloads after a failure still has it.
 * Returns a function that stops listening.
 */
export function startDiagnosticsCapture(
  buffer: LogBuffer,
  target: Window,
): () => void {
  const storage = sessionStorageOf(target);
  const earlier = storage ? loadLog(storage) : [];
  const sinceLoad = buffer.entries();
  buffer.clear();
  for (const entry of earlier) buffer.push(entry);
  buffer.push(
    line(
      "info",
      earlier.length > 0
        ? `page loaded; ${earlier.length} lines kept from before the reload`
        : "page loaded",
    ),
  );
  for (const entry of sinceLoad) buffer.push(entry);

  const save = () => {
    if (storage) saveLog(storage, buffer.entries());
  };
  const onVisibility = () => {
    if (target.document.visibilityState === "hidden") save();
  };
  const onError = (event: ErrorEvent) => {
    const where = event.filename
      ? ` at ${event.filename}:${event.lineno}:${event.colno}`
      : "";
    buffer.push(
      line(
        "error",
        `Uncaught ${serializeLogArgs([event.error ?? event.message])}${where}`,
      ),
    );
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    buffer.push(
      line("error", `Unhandled rejection: ${serializeLogArgs([event.reason])}`),
    );
  };

  target.addEventListener("pagehide", save);
  target.document.addEventListener("visibilitychange", onVisibility);
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("pagehide", save);
    target.document.removeEventListener("visibilitychange", onVisibility);
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
