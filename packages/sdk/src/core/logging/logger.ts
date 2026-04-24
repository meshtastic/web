import { Logger } from "tslog";

const prettyLogTemplate = "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t";

export function createLogger(name: string): Logger<unknown> {
  return new Logger({ name, prettyLogTemplate });
}

export type { Logger };
