import { MessageState, type Message } from "@core/storage/types.ts";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  applyThreadFilter,
  compileFilter,
  type FilterState,
  filterAppliesTo,
  isFiltered,
  MAX_CHECK_LENGTH,
  parseFilterEntry,
  shouldFilterIncoming,
  sortFilterEntries,
  validateFilterEntry,
} from "./messageFilter.ts";
import type { ThreadMessage } from "./thread.ts";

const matches = (entries: string[], text: string) =>
  isFiltered(text, compileFilter(entries));

/** The stored entry, or the error kind. Results don't compare with toEqual. */
const outcome = (input: string, existing: string[] = []) => {
  const result = validateFilterEntry(input, existing);
  return Result.isOk(result) ? result.value : result.error.kind;
};

describe("parseFilterEntry", () => {
  it("tells words from regex: entries, prefix case-sensitive", () => {
    expect(parseFilterEntry("spam")).toEqual({
      kind: "word",
      raw: "spam",
      word: "spam",
    });
    expect(parseFilterEntry("regex:test\\d+")).toEqual({
      kind: "regex",
      raw: "regex:test\\d+",
      pattern: "test\\d+",
    });
    expect(parseFilterEntry("REGEX:x").kind).toBe("word");
  });
});

describe("isFiltered (Android MessageFilterImplTest cases)", () => {
  it("matches an exact word", () => {
    expect(matches(["spam"], "this is spam")).toBe(true);
  });

  it("ignores case", () => {
    expect(matches(["spam"], "This is SPAM")).toBe(true);
  });

  it("matches whole words only", () => {
    expect(matches(["spam"], "antispam software")).toBe(false);
    expect(matches(["spam"], "spam, eggs")).toBe(true);
  });

  it("supports regex: patterns, searched anywhere", () => {
    expect(matches(["regex:test\\d+"], "this is test123")).toBe(true);
    expect(matches(["regex:test\\d+"], "this is test")).toBe(false);
    expect(matches(["regex:SP.M"], "a spam b")).toBe(true);
  });

  it("skips an entry that does not compile", () => {
    expect(matches(["regex:[invalid"], "any message")).toBe(false);
    expect(matches(["regex:[invalid", "spam"], "spam")).toBe(true);
  });

  it("matches nothing without entries", () => {
    expect(matches([], "anything")).toBe(false);
  });

  it("takes a word literally", () => {
    expect(matches(["a.b"], "axb")).toBe(false);
    expect(matches(["a.b"], "see a.b now")).toBe(true);
    expect(matches(["(x)"], "f(x)")).toBe(false);
  });

  it("finds Unicode words, with Unicode case folding", () => {
    expect(matches(["café"], "un café noir")).toBe(true);
    expect(matches(["CAFÉ"], "un café noir")).toBe(true);
    expect(matches(["спам"], "это СПАМ!")).toBe(true);
    expect(matches(["спам"], "антиспам")).toBe(false);
    expect(matches(["ä"], "bär")).toBe(false);
  });

  it("matches a word next to emoji and punctuation", () => {
    expect(matches(["spam"], "🙄spam🙄")).toBe(true);
    expect(matches(["spam"], "(spam)")).toBe(true);
  });

  it("needs a word character beside a boundary, as Android's \\b does", () => {
    expect(matches(["#tag"], "hi #tag")).toBe(false);
    expect(matches(["#tag"], "hi#tag")).toBe(true);
  });

  it("checks only the first MAX_CHECK_LENGTH characters", () => {
    const pad = "x ".repeat(MAX_CHECK_LENGTH / 2);
    expect(matches(["spam"], `${pad}spam`)).toBe(false);
    expect(matches(["spam"], `spam ${pad}`)).toBe(true);
  });
});

describe("validateFilterEntry", () => {
  it("trims, and rejects empty input", () => {
    expect(outcome("  spam ")).toBe("spam");
    expect(outcome("   ")).toBe("empty");
  });

  it("rejects an exact duplicate only", () => {
    expect(outcome("spam", ["spam"])).toBe("duplicate");
    expect(outcome(" spam ", ["spam"])).toBe("duplicate");
    expect(outcome("Spam", ["spam"])).toBe("Spam");
  });

  it("rejects an invalid regex with the reason", () => {
    const result = validateFilterEntry("regex:(unclosed", []);
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error.kind).toBe("invalidRegex");
      if (result.error.kind === "invalidRegex") {
        expect(result.error.reason.length).toBeGreaterThan(0);
        expect(result.error.reason).not.toContain("(unclosed");
      }
    }
  });

  it("rejects regex: with no pattern, which would hide everything", () => {
    expect(outcome("regex:")).toBe("emptyPattern");
  });

  it("accepts a valid regex", () => {
    expect(outcome("regex:^buy\\b")).toBe("regex:^buy\\b");
  });
});

const ON: FilterState = {
  enabled: true,
  matcher: compileFilter(["spam"]),
  optedOut: new Set(["d:7"]),
};

describe("filterAppliesTo / shouldFilterIncoming", () => {
  it("applies only while enabled, with words, outside opted-out conversations", () => {
    expect(filterAppliesTo(ON, "c:0")).toBe(true);
    expect(filterAppliesTo(ON, "d:7")).toBe(false);
    expect(filterAppliesTo({ ...ON, enabled: false }, "c:0")).toBe(false);
    expect(filterAppliesTo({ ...ON, matcher: compileFilter([]) }, "c:0")).toBe(
      false,
    );
  });

  it("never filters my own message", () => {
    expect(shouldFilterIncoming(ON, "c:0", { from: 5, text: "spam" }, 9)).toBe(
      true,
    );
    expect(shouldFilterIncoming(ON, "c:0", { from: 9, text: "spam" }, 9)).toBe(
      false,
    );
  });
});

const message = (id: number, from: number, text: string): Message => ({
  id,
  from,
  to: 0xffffffff,
  channel: 0,
  rxTime: new Date(id * 1000),
  type: "broadcast",
  text,
  state: MessageState.Ack,
});

const item = (m: Message, outgoing: boolean): ThreadMessage => ({
  message: m,
  outgoing,
  reactions: [],
});

describe("applyThreadFilter", () => {
  const thread = [
    item(message(1, 5, "hello"), false),
    item(message(2, 5, "buy spam now"), false),
    item(message(3, 9, "spam is mine"), true),
  ];
  const matcher = compileFilter(["spam"]);

  it("hides matching incoming messages but never mine", () => {
    const out = applyThreadFilter(thread, {
      active: true,
      matcher,
      reveal: false,
    });
    expect(out.messages.map((t) => t.message.id)).toEqual([1, 3]);
    expect(out.filtered).toBe(1);
  });

  it("reveals them marked when asked", () => {
    const out = applyThreadFilter(thread, {
      active: true,
      matcher,
      reveal: true,
    });
    expect(out.messages.map((t) => [t.message.id, t.filtered])).toEqual([
      [1, undefined],
      [2, true],
      [3, undefined],
    ]);
  });

  it("returns the thread untouched when inactive or nothing matches", () => {
    expect(
      applyThreadFilter(thread, { active: false, matcher, reveal: false })
        .messages,
    ).toBe(thread);
    expect(
      applyThreadFilter(thread, {
        active: true,
        matcher: compileFilter(["absent"]),
        reveal: false,
      }).messages,
    ).toBe(thread);
  });
});

describe("sortFilterEntries", () => {
  it("sorts by code unit, like Kotlin's sorted()", () => {
    expect(sortFilterEntries(["b", "B", "a", "regex:x"])).toEqual([
      "B",
      "a",
      "b",
      "regex:x",
    ]);
  });
});
