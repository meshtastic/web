import { describe, expect, it } from "vitest";
import { cn } from "./cn.ts";

describe("cn with design-token classes", () => {
  it.each([
    ["text-meta text-muted", "text-meta text-muted"],
    ["text-sm text-meta", "text-meta"],
    ["text-muted text-primary", "text-primary"],
    ["rounded-md rounded-bubble", "rounded-bubble"],
    ["rounded-bubble rounded-br-tail", "rounded-bubble rounded-br-tail"],
    ["shadow-lg shadow-popover", "shadow-popover"],
    ["shadow-popover text-muted", "shadow-popover text-muted"],
    ["bg-surface bg-raised", "bg-raised"],
    ["border-control border-input", "border-input"],
  ])("merges %j to %j", (input, expected) => {
    expect(cn(input)).toBe(expected);
  });
});
