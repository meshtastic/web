import {
  createLogBuffer,
  type LogBuffer,
  type LogLevel,
} from "@core/diagnostics/logBuffer.ts";
import { serializeLogArgs } from "@core/diagnostics/serialize.ts";
import { LogLevel as TsLogLevel, Logger as TsLogger } from "tslog";

const prettyLogTemplate =
  "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t";

/** How many recent lines "Download diagnostics" can include. */
const DIAGNOSTICS_CAPACITY = 2000;

/**
 * Recent log lines from every logger, debug and up, whatever the console
 * shows. Trace is left out: the SDK logs per-packet detail there.
 */
export const diagnosticsLog: LogBuffer = createLogBuffer(DIAGNOSTICS_CAPACITY);

/** tslog's id and name for each level, for its generic `log` method. */
const TSLOG_LEVELS = {
  trace: [TsLogLevel.TRACE, "TRACE"],
  debug: [TsLogLevel.DEBUG, "DEBUG"],
  info: [TsLogLevel.INFO, "INFO"],
  warn: [TsLogLevel.WARN, "WARN"],
  error: [TsLogLevel.ERROR, "ERROR"],
} as const satisfies Record<LogLevel, readonly [number, string]>;

/** `debug` when `localStorage["mesh-debug"]` is "1", else `info`. */
function defaultMinLevel(): number {
  try {
    if (globalThis.localStorage?.getItem("mesh-debug") === "1") return 2;
  } catch {
    // localStorage access can throw in private mode and sandboxed iframes.
  }
  return 3;
}

export interface Logger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * A named logger. Lines go to the console at the configured level and, from
 * debug up, into {@link diagnosticsLog}. tslog drops lines below its own
 * level before any transport sees them, so capture happens here instead.
 */
export function createLogger(
  name: string,
  options?: { minLevel?: number },
): Logger {
  const output = new TsLogger({
    name,
    pretty: { template: prettyLogTemplate },
    minLevel: options?.minLevel ?? defaultMinLevel(),
  });
  const at =
    (level: LogLevel) =>
    (...args: unknown[]): void => {
      if (level !== "trace") {
        diagnosticsLog.push({
          time: Date.now(),
          level,
          logger: name,
          message: serializeLogArgs(args),
        });
      }
      const [id, levelName] = TSLOG_LEVELS[level];
      output.log(id, levelName, ...args);
    };
  return {
    trace: at("trace"),
    debug: at("debug"),
    info: at("info"),
    warn: at("warn"),
    error: at("error"),
  };
}
