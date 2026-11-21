import { describe, expect, it } from "vitest";
import {
  commandMenuShortcutLabel,
  isApplePlatform,
  isCommandMenuShortcut,
  type ShortcutKeyEvent,
} from "./shortcut.ts";

const key = (overrides: Partial<ShortcutKeyEvent>): ShortcutKeyEvent => ({
  key: "k",
  code: "KeyK",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
});

describe("isCommandMenuShortcut", () => {
  it("accepts ⌘K and Ctrl+K", () => {
    expect(isCommandMenuShortcut(key({ metaKey: true }))).toBe(true);
    expect(isCommandMenuShortcut(key({ ctrlKey: true }))).toBe(true);
    expect(isCommandMenuShortcut(key({ key: "K", ctrlKey: true }))).toBe(true);
  });

  it("accepts the K key on non-Latin layouts", () => {
    expect(isCommandMenuShortcut(key({ key: "л", metaKey: true }))).toBe(true);
  });

  it("rejects plain K and other combinations", () => {
    expect(isCommandMenuShortcut(key({}))).toBe(false);
    expect(isCommandMenuShortcut(key({ ctrlKey: true, shiftKey: true }))).toBe(
      false,
    );
    expect(isCommandMenuShortcut(key({ metaKey: true, altKey: true }))).toBe(
      false,
    );
    expect(
      isCommandMenuShortcut(key({ key: "j", code: "KeyJ", metaKey: true })),
    ).toBe(false);
    // Dvorak: the physical K key types "t".
    expect(isCommandMenuShortcut(key({ key: "t", metaKey: true }))).toBe(false);
  });
});

describe("platform label", () => {
  it("uses ⌘ on Apple platforms and Ctrl elsewhere", () => {
    expect(isApplePlatform("MacIntel")).toBe(true);
    expect(isApplePlatform("iPhone")).toBe(true);
    expect(commandMenuShortcutLabel("MacIntel", "Strg")).toBe("⌘K");
    expect(commandMenuShortcutLabel("Win32", "Strg")).toBe("Strg K");
  });
});
