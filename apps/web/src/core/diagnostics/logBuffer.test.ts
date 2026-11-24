import { describe, expect, it } from "vitest";
import { createLogBuffer, type LogEntry } from "./logBuffer.ts";

const entry = (n: number): LogEntry => ({
  time: n,
  level: "info",
  logger: "test",
  message: `line ${n}`,
});

describe("createLogBuffer", () => {
  it("returns entries oldest first while under capacity", () => {
    const buffer = createLogBuffer(3);
    buffer.push(entry(1));
    buffer.push(entry(2));
    expect(buffer.entries().map((e) => e.time)).toEqual([1, 2]);
  });

  it("drops the oldest entries once full", () => {
    const buffer = createLogBuffer(3);
    for (let n = 1; n <= 7; n++) buffer.push(entry(n));
    expect(buffer.entries().map((e) => e.time)).toEqual([5, 6, 7]);
  });

  it("returns a copy, so callers cannot change the buffer", () => {
    const buffer = createLogBuffer(2);
    buffer.push(entry(1));
    buffer.entries().pop();
    expect(buffer.entries()).toHaveLength(1);
  });

  it("clear empties it and keeps working", () => {
    const buffer = createLogBuffer(2);
    for (let n = 1; n <= 3; n++) buffer.push(entry(n));
    buffer.clear();
    expect(buffer.entries()).toEqual([]);
    buffer.push(entry(9));
    expect(buffer.entries().map((e) => e.time)).toEqual([9]);
  });

  it("treats a capacity below one as one", () => {
    const buffer = createLogBuffer(0);
    buffer.push(entry(1));
    buffer.push(entry(2));
    expect(buffer.entries().map((e) => e.time)).toEqual([2]);
  });
});
