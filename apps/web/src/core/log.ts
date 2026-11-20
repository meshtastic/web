import { Logger } from "tslog";

const prettyLogTemplate =
  "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t";

/** `debug` when `localStorage["mesh-debug"]` is "1", else `info`. */
function defaultMinLevel(): number {
  try {
    if (globalThis.localStorage?.getItem("mesh-debug") === "1") return 2;
  } catch {
    // localStorage access can throw in private mode and sandboxed iframes.
  }
  return 3;
}

export function createLogger(
  name: string,
  options?: { minLevel?: number },
): Logger<unknown> {
  return new Logger({
    name,
    pretty: { template: prettyLogTemplate },
    minLevel: options?.minLevel ?? defaultMinLevel(),
  });
}

export type { Logger };
