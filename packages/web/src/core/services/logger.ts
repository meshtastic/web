import { Logger } from "tslog";

type LogLevel =
  | "silly"
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";

const LOG_LEVEL_MAP: Record<LogLevel, number> = {
  silly: 0,
  trace: 1,
  debug: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6,
};

function getLogLevel(): number {
  // Check localStorage for log level override
  const storedLevel = localStorage.getItem(
    "meshtastic-log-level",
  ) as LogLevel | null;
  if (storedLevel && storedLevel in LOG_LEVEL_MAP) {
    return LOG_LEVEL_MAP[storedLevel];
  }

  // Default to 'info' in production, 'debug' in development
  return import.meta.env.PROD ? LOG_LEVEL_MAP.info : LOG_LEVEL_MAP.debug;
}

// Main application logger
const logger = new Logger({
  name: "MeshWeb",
  minLevel: getLogLevel(),
  prettyLogTemplate:
    "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t",
  prettyLogTimeZone: "local",
});

// Create child loggers for different modules
export const createLogger = (name: string): Logger<unknown> => {
  return logger.getSubLogger({ name });
};

// Pre-configured loggers for common modules
export const deviceLogger = createLogger("Device");
export const connectionLogger = createLogger("Connection");
export const configLogger = createLogger("Config");
export const dbLogger = createLogger("DB");
export const uiLogger = createLogger("UI");
export const yamlLogger = createLogger("YAML");

// Utility to change log level at runtime (useful for debugging)
export const setLogLevel = (level: LogLevel): void => {
  localStorage.setItem("meshtastic-log-level", level);
  // Note: Requires page reload to take effect
  console.info(
    `Log level set to ${level}. Reload the page for changes to take effect.`,
  );
};

// Export the main logger as default
export default logger;
