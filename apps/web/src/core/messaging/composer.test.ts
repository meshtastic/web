import { describe, expect, it } from "vitest";
import {
  composerEmojiAction,
  composerKeyAction,
  insertEmoji,
} from "./composer.ts";

describe("insertEmoji", () => {
  it("inserts at the caret and puts the caret after the emoji", () => {
    expect(insertEmoji("hi there", 2, 2, "👋")).toEqual({
      ok: true,
      text: "hi👋 there",
      caret: 4,
    });
  });

  it("replaces a selection, whichever way it was made", () => {
    expect(insertEmoji("I am sad", 5, 8, "😂")).toEqual({
      ok: true,
      text: "I am 😂",
      caret: 7,
    });
    expect(insertEmoji("I am sad", 8, 5, "😂")).toMatchObject({
      text: "I am 😂",
    });
  });

  it("clamps an out-of-range selection to the text", () => {
    expect(insertEmoji("ok", 10, 12, "👍")).toEqual({
      ok: true,
      text: "ok👍",
      caret: 4,
    });
  });

  it("counts the caret in UTF-16 units for multi-unit emoji", () => {
    const zwj = "🧔🏼‍♂️";
    const result = insertEmoji("", 0, 0, zwj);
    expect(result).toEqual({ ok: true, text: zwj, caret: zwj.length });
  });

  it("refuses an emoji that would go over 200 bytes", () => {
    const full = "a".repeat(197);
    // 👍 is 4 bytes: 201.
    expect(insertEmoji(full, 197, 197, "👍")).toEqual({
      ok: false,
      reason: "tooLong",
    });
    // ✌ (3 bytes) still fits: 200.
    expect(insertEmoji(full, 197, 197, "✌")).toMatchObject({ ok: true });
    // Replacing a selection frees its bytes.
    expect(insertEmoji(full, 0, 10, "👍")).toMatchObject({ ok: true });
  });
});

describe("composerEmojiAction", () => {
  it("inserts into the text when not replying, whatever the mode", () => {
    for (const tapbackMode of [true, false]) {
      for (const source of ["quick", "grid"] as const) {
        expect(
          composerEmojiAction({ replying: false, tapbackMode, source }),
        ).toBe("insert");
      }
    }
  });

  it("sends a tapback from the quick row while replying", () => {
    expect(
      composerEmojiAction({
        replying: true,
        tapbackMode: false,
        source: "quick",
      }),
    ).toBe("tapback");
  });

  it("follows the mode for grid picks while replying", () => {
    expect(
      composerEmojiAction({
        replying: true,
        tapbackMode: true,
        source: "grid",
      }),
    ).toBe("tapback");
    expect(
      composerEmojiAction({
        replying: true,
        tapbackMode: false,
        source: "grid",
      }),
    ).toBe("insert");
  });
});

describe("composerKeyAction with @mention suggestions", () => {
  const key = (
    k: string,
    extra: Partial<Parameters<typeof composerKeyAction>[0]> = {},
  ) =>
    composerKeyAction({
      key: k,
      shiftKey: false,
      isComposing: false,
      replying: true,
      mentionOpen: true,
      ...extra,
    });

  it("moves, picks and closes while they show", () => {
    expect(key("ArrowDown")).toBe("mentionNext");
    expect(key("ArrowUp")).toBe("mentionPrevious");
    expect(key("Enter")).toBe("mentionPick");
    expect(key("Tab")).toBe("mentionPick");
    // Escape closes them and leaves the reply alone.
    expect(key("Escape")).toBe("mentionClose");
  });

  it("lets an IME composition and Shift+Enter through", () => {
    expect(key("Enter", { isComposing: true })).toBe("default");
    expect(key("Enter", { shiftKey: true })).toBe("default");
  });

  it("is the usual keys once they're closed", () => {
    expect(key("Enter", { mentionOpen: false })).toBe("send");
    expect(key("Escape", { mentionOpen: false })).toBe("cancelReply");
    expect(key("ArrowDown", { mentionOpen: false })).toBe("default");
  });
});
