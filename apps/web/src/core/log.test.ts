import { Logger } from "tslog";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, diagnosticsLog } from "./log.ts";

describe("createLogger", () => {
  afterEach(() => {
    diagnosticsLog.clear();
    vi.restoreAllMocks();
  });

  it("captures debug lines even when the console shows info and up", () => {
    const log = createLogger("test", { minLevel: 3 });
    log.debug("stage", { attempt: 2 });
    expect(diagnosticsLog.entries()).toEqual([
      expect.objectContaining({
        level: "debug",
        logger: "test",
        message: "stage {attempt: 2}",
      }),
    ]);
  });

  it("leaves trace lines out of the capture", () => {
    const log = createLogger("test", { minLevel: 0 });
    log.trace("per-packet detail");
    expect(diagnosticsLog.entries()).toEqual([]);
  });

  it("passes every call on to tslog with its level and arguments", () => {
    const forward = vi.spyOn(Logger.prototype, "log");
    const log = createLogger("test");
    const detail = { stage: "Seeding Session" };
    log.warn("timeout", detail);
    log.trace("packet");
    expect(forward.mock.calls).toEqual([
      [4, "WARN", "timeout", detail],
      [1, "TRACE", "packet"],
    ]);
  });
});
