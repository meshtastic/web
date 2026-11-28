import { describe, expect, it } from "vitest";
import {
  applyComposerEdit,
  composerMentionQuery,
  composerText,
  currentMentionQuery,
  deleteMention,
  displayToWireOffset,
  insertMention,
  matchMentionCandidates,
  mentionLabel,
  mentionsToText,
  mentionToken,
  parseMentions,
  textMentionsNode,
  wireToDisplayOffset,
} from "./mentions.ts";

const ALICE = 0xffccee11;
const BOB = 0x0000beef;
const names = new Map([
  [ALICE, "Alice"],
  [BOB, "Bob Smith"],
]);
const name = (num: number) => names.get(num);

describe("mentionToken", () => {
  it("is @ and the node's zero-padded hex id", () => {
    expect(mentionToken(ALICE)).toBe("@!ffccee11");
    expect(mentionToken(BOB)).toBe("@!0000beef");
  });
});

describe("parseMentions", () => {
  it("splits text into plain runs and tokens", () => {
    expect(parseMentions("hi @!ffccee11, and @!0000BEEF!")).toEqual([
      { kind: "text", text: "hi " },
      { kind: "mention", nodeNum: ALICE, raw: "@!ffccee11" },
      { kind: "text", text: ", and " },
      { kind: "mention", nodeNum: BOB, raw: "@!0000BEEF" },
      { kind: "text", text: "!" },
    ]);
  });

  it("finds tokens with no surrounding text, back to back", () => {
    expect(parseMentions("@!ffccee11@!0000beef")).toEqual([
      { kind: "mention", nodeNum: ALICE, raw: "@!ffccee11" },
      { kind: "mention", nodeNum: BOB, raw: "@!0000beef" },
    ]);
  });

  it("rejects a longer id, a short one and non-hex digits", () => {
    for (const text of [
      "@!ffccee11a",
      "@!ffccee1",
      "@!ffccee1g",
      "@ffccee11",
    ]) {
      expect(parseMentions(text)).toEqual([{ kind: "text", text }]);
    }
  });

  it("accepts a token followed by a non-hex letter", () => {
    expect(parseMentions("@!ffccee11g")[0]).toMatchObject({ kind: "mention" });
  });

  it("returns nothing for empty text", () => {
    expect(parseMentions("")).toEqual([]);
  });
});

describe("textMentionsNode", () => {
  it("matches the id case-insensitively", () => {
    expect(textMentionsNode("hey @!FFCCEE11", "!ffccee11")).toBe(true);
    expect(textMentionsNode("hey @!ffccee11", "!FFCCEE11")).toBe(true);
  });

  it("honours the token boundary", () => {
    expect(textMentionsNode("hey @!ffccee11a", "!ffccee11")).toBe(false);
    expect(textMentionsNode("hey @!ffccee11 a", "!ffccee11")).toBe(true);
  });

  it("does not match other nodes, a bare id or empty input", () => {
    expect(textMentionsNode("hey @!0000beef", "!ffccee11")).toBe(false);
    expect(textMentionsNode("hey !ffccee11", "!ffccee11")).toBe(false);
    expect(textMentionsNode(undefined, "!ffccee11")).toBe(false);
    expect(textMentionsNode("", "!ffccee11")).toBe(false);
    expect(textMentionsNode("@!ffccee11", "!")).toBe(false);
  });
});

describe("mentionLabel", () => {
  it("is the long name, else the short name, else nothing", () => {
    expect(mentionLabel({ longName: "Alice", shortName: "AL" })).toBe("Alice");
    expect(mentionLabel({ longName: " ", shortName: "AL" })).toBe("AL");
    expect(mentionLabel({})).toBeUndefined();
  });
});

describe("mentionsToText", () => {
  it("shows known mentions by name and unknown ones raw", () => {
    expect(mentionsToText("@!ffccee11 meet @!12345678", name)).toBe(
      "@Alice meet @!12345678",
    );
  });

  it("leaves text without mentions alone", () => {
    expect(mentionsToText("plain", name)).toBe("plain");
  });
});

describe("currentMentionQuery", () => {
  it("finds an @ at the start or after whitespace", () => {
    expect(currentMentionQuery("@al", 3)).toEqual({
      start: 0,
      end: 3,
      query: "al",
    });
    expect(currentMentionQuery("hi @al", 6)).toEqual({
      start: 3,
      end: 6,
      query: "al",
    });
    expect(currentMentionQuery("hi\n@", 4)).toEqual({
      start: 3,
      end: 4,
      query: "",
    });
  });

  it("ignores an @ inside a word (an email address)", () => {
    expect(currentMentionQuery("me@host", 7)).toBeUndefined();
  });

  it("ends at whitespace: a finished mention is no query", () => {
    expect(currentMentionQuery("@al ", 4)).toBeUndefined();
    expect(currentMentionQuery("@al x", 5)).toBeUndefined();
  });

  it("only looks before the caret", () => {
    expect(currentMentionQuery("@alice", 2)).toEqual({
      start: 0,
      end: 2,
      query: "a",
    });
  });

  it("needs a collapsed caret after something", () => {
    expect(currentMentionQuery("@al", 1, 3)).toBeUndefined();
    expect(currentMentionQuery("@al", 0)).toBeUndefined();
    expect(currentMentionQuery("hello", 5)).toBeUndefined();
  });
});

describe("matchMentionCandidates", () => {
  const candidates = [
    { num: 1, id: "!00000001", longName: "Alice Base", shortName: "ALB" },
    { num: 2, id: "!00000002", longName: "Bob", shortName: "BOB" },
    { num: 3, id: "!0000abcd", longName: "Carol", shortName: "CRL" },
    { num: 4, id: "!00000004", shortName: "D4" },
    { num: 5, id: "!00000005", longName: "Eve" },
    { num: 6, id: "!00000006", longName: "Frank" },
  ];

  it("matches long name, short name or id, case-insensitively", () => {
    expect(
      matchMentionCandidates(candidates, "base").map((c) => c.num),
    ).toEqual([1]);
    expect(matchMentionCandidates(candidates, "crl").map((c) => c.num)).toEqual(
      [3],
    );
    expect(
      matchMentionCandidates(candidates, "!0000AB").map((c) => c.num),
    ).toEqual([3]);
    expect(matchMentionCandidates(candidates, "d4").map((c) => c.num)).toEqual([
      4,
    ]);
  });

  it("offers the first five, in order, for an empty query", () => {
    expect(matchMentionCandidates(candidates, "").map((c) => c.num)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("stops at the limit", () => {
    expect(matchMentionCandidates(candidates, "!0000", 2)).toHaveLength(2);
    expect(matchMentionCandidates(candidates, "", 0)).toEqual([]);
  });
});

describe("composerText", () => {
  it("shows tokens as @Name and records where they are", () => {
    const text = composerText("hi @!ffccee11 and @!0000beef", name);
    expect(text.display).toBe("hi @Alice and @Bob Smith");
    expect(text.ranges).toEqual([
      { start: 3, end: 9, nodeNum: ALICE, token: "@!ffccee11" },
      { start: 14, end: 24, nodeNum: BOB, token: "@!0000beef" },
    ]);
  });

  it("shows an unknown node's token raw, still as one mention", () => {
    const text = composerText("@!12345678", name);
    expect(text.display).toBe("@!12345678");
    expect(text.ranges).toHaveLength(1);
  });

  it("maps offsets both ways, snapping inside a mention past it", () => {
    const text = composerText("hi @!0000beef!", name);
    // display "hi @Bob Smith!"
    expect(displayToWireOffset(text, 3)).toBe(3);
    expect(displayToWireOffset(text, 13)).toBe(13);
    expect(displayToWireOffset(text, 14)).toBe(14);
    expect(displayToWireOffset(text, 6)).toBe(13);
    expect(wireToDisplayOffset(text, 13)).toBe(13);
    expect(wireToDisplayOffset(text, 5)).toBe(13);
    expect(wireToDisplayOffset(text, 2)).toBe(2);
  });
});

const editWire = (...args: Parameters<typeof applyComposerEdit>): string =>
  applyComposerEdit(...args).wire;

describe("applyComposerEdit", () => {
  const text = composerText("hi @!ffccee11 there", name);
  // display "hi @Alice there"

  it("keeps mentions around an edit elsewhere", () => {
    expect(editWire(text, "oh hi @Alice there", 3)).toBe(
      "oh hi @!ffccee11 there",
    );
    expect(editWire(text, "hi @Alice there!", 16)).toBe("hi @!ffccee11 there!");
  });

  it("keeps a mention when typing right before or after it", () => {
    expect(editWire(text, "hi x@Alice there", 4)).toBe("hi x@!ffccee11 there");
    expect(editWire(text, "hi @Alice, there", 10)).toBe("hi @!ffccee11, there");
  });

  it("drops a mention typed inside, leaving its name as text", () => {
    expect(editWire(text, "hi @Alxice there", 7)).toBe("hi @Alxice there");
  });

  it("uses the caret to tell typing inside from typing after", () => {
    const tommy = composerText("@!ffccee11", () => "Tommy");
    // "@Tommy" + "y", typed between the m and the y: inside.
    expect(editWire(tommy, "@Tommyy", 6)).toBe("@Tommyy");
    // The same text, typed at the end: after.
    expect(editWire(tommy, "@Tommyy", 7)).toBe("@!ffccee11y");
  });

  it("drops a mention a hex digit now follows (it'd be another id)", () => {
    const tight = composerText("@!ffccee11 x", name);
    // Delete the space, then type "a" after the name.
    expect(editWire(tight, "@Alicea x", 7)).toBe("@Alicea x");
    expect(editWire(tight, "@Alice, x", 7)).toBe("@!ffccee11, x");
  });

  it("drops a mention a selection replaced part of", () => {
    expect(editWire(text, "hi @Al!", 7)).toBe("hi @Al!");
  });

  it("is the text itself when there are no mentions", () => {
    expect(editWire(composerText("abc", name), "abcd", 4)).toBe("abcd");
  });
});

describe("deleteMention", () => {
  const text = composerText("hi @!ffccee11 there", name);
  // display "hi @Alice there"

  it("Backspace just after a mention deletes all of it", () => {
    expect(deleteMention(text, 9, 9, "backward")).toEqual({
      wire: "hi  there",
      caret: 3,
    });
  });

  it("Backspace inside a mention deletes all of it", () => {
    expect(deleteMention(text, 5, 5, "backward")?.wire).toBe("hi  there");
  });

  it("Delete just before a mention deletes all of it", () => {
    expect(deleteMention(text, 3, 3, "forward")).toEqual({
      wire: "hi  there",
      caret: 3,
    });
  });

  it("leaves other positions to the field", () => {
    expect(deleteMention(text, 3, 3, "backward")).toBeUndefined();
    expect(deleteMention(text, 9, 9, "forward")).toBeUndefined();
    expect(deleteMention(text, 12, 12, "backward")).toBeUndefined();
    expect(deleteMention(text, 10, 12, "backward")).toBeUndefined();
  });

  it("widens a selection that cuts into a mention", () => {
    expect(deleteMention(text, 1, 5, "backward")).toEqual({
      wire: "h there",
      caret: 1,
    });
  });

  it("maps the caret past mentions before it", () => {
    const two = composerText("@!0000beef @!ffccee11", name);
    // display "@Bob Smith @Alice"
    expect(deleteMention(two, 17, 17, "backward")).toEqual({
      wire: "@!0000beef ",
      caret: 11,
    });
  });
});

describe("insertMention", () => {
  it("replaces the query with the token and a space", () => {
    const text = composerText("hi @al", name);
    const query = currentMentionQuery(text.display, 6);
    expect(query).toBeDefined();
    if (!query) {
      return;
    }
    expect(insertMention(text, query, ALICE)).toEqual({
      wire: "hi @!ffccee11 ",
      caret: 14,
    });
  });

  it("reuses a space that follows already", () => {
    const text = composerText("@b there", name);
    expect(insertMention(text, { start: 0, end: 2, query: "b" }, BOB)).toEqual({
      wire: "@!0000beef there",
      caret: 11,
    });
  });

  it("lands in the right wire position after other mentions", () => {
    const text = composerText("@!0000beef @a", name);
    // display "@Bob Smith @a"
    const query = composerMentionQuery(text, 13, 13);
    expect(query).toEqual({ start: 11, end: 13, query: "a" });
    if (!query) {
      return;
    }
    expect(insertMention(text, query, ALICE).wire).toBe(
      "@!0000beef @!ffccee11 ",
    );
  });
});

describe("composerMentionQuery", () => {
  it("is no query when the @ is a mention's own", () => {
    const text = composerText("@!ffccee11", name);
    expect(composerMentionQuery(text, 6, 6)).toBeUndefined();
  });
});
