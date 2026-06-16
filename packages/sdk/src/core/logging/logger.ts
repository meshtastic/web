import { Logger } from "tslog";

const prettyLogTemplate =
  "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t";

/**
 * Minimum log level. Default is `info` (3). Lifts to `debug` (2) when:
 * - `localStorage["mesh-debug"] === "1"` in a browser context, or
 * - `process.env.MESH_DEBUG === "1"` in a Node / Bun / Deno context.
 *
 * Read once per `createLogger` call so the flag can be flipped at any
 * time and new sub-loggers will pick it up; existing logger instances
 * keep their level unless the caller explicitly resets it.
 */
function defaultMinLevel(): number {
  try {
    if (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as { localStorage?: Storage }).localStorage !==
        "undefined" &&
      (globalThis as { localStorage: Storage }).localStorage.getItem(
        "mesh-debug",
      ) === "1"
    ) {
      return 2;
    }
  } catch {
    // localStorage access can throw in private mode / sandboxed iframes.
  }
  if (
    typeof globalThis !== "undefined" &&
    (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.MESH_DEBUG === "1"
  ) {
    return 2;
  }
  return 3;
}

export function createLogger(
  name: string,
  options?: { minLevel?: number },
): Logger<unknown> {
  return new Logger({
    name,
    prettyLogTemplate,
    minLevel: options?.minLevel ?? defaultMinLevel(),
  });
}

export type { Logger };
