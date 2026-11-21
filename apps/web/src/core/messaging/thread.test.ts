import {
  type Message,
  MessageState,
  type Reaction,
} from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import {
  buildThread,
  createThreadBuilder,
  excerpt,
  missingReplyTargets,
  resolveReply,
} from "./thread.ts";

const ME = 100;

const msg = (id: number, from: number, text: string, extra = {}): Message => ({
  id,
  from,
  to: 0xffffffff,
  channel: 0,
  rxTime: new Date(id * 1000),
  type: "broadcast",
  text,
  state: MessageState.Ack,
  ...extra,
});

const reaction = (
  targetId: number,
  fromNode: number,
  emoji: string,
): Reaction => ({
  targetId,
  fromNode,
  emoji,
  packetId: 900 + fromNode,
  to: 0xffffffff,
  rxTime: new Date(0),
  state: MessageState.Ack,
});

describe("excerpt", () => {
  it("collapses whitespace", () => {
    expect(excerpt("  a\n\n b\tc ")).toBe("a b c");
  });

  it("cuts long text by code points with an ellipsis", () => {
    expect(excerpt("abcdef", 4)).toBe("abc…");
    expect(excerpt("👍👍👍👍👍", 3)).toBe("👍👍…");
    expect(excerpt("abc", 3)).toBe("abc");
  });
});

describe("resolveReply", () => {
  it("quotes the target's sender and text", () => {
    const target = msg(1, 5, "original");
    expect(resolveReply(1, (id) => (id === 1 ? target : undefined))).toEqual({
      kind: "resolved",
      id: 1,
      from: 5,
      excerpt: "original",
    });
  });

  it("says so when the target isn't stored", () => {
    expect(resolveReply(9, () => undefined)).toEqual({
      kind: "unavailable",
      id: 9,
    });
  });
});

describe("buildThread", () => {
  it("joins replies, reactions and delivery state", () => {
    const messages = [
      msg(1, 5, "hello"),
      msg(2, ME, "hi back", { replyId: 1, state: MessageState.Pending }),
      msg(3, 6, "late reply", { replyId: 77 }),
    ];
    const thread = buildThread(
      messages,
      [reaction(1, 6, "👍"), reaction(1, ME, "👍"), reaction(2, 5, "❤️")],
      {
        myNodeNum: ME,
        lookup: (id) => (id === 77 ? msg(77, 8, "from long ago") : undefined),
      },
    );

    expect(thread[0]).toEqual({
      message: messages[0],
      outgoing: false,
      reactions: [
        {
          emoji: "👍",
          count: 2,
          mine: true,
          fromNodes: [6, ME],
          own: { packetId: 900 + ME, state: MessageState.Ack },
        },
      ],
    });
    expect(thread[1]).toMatchObject({
      outgoing: true,
      replyTo: { kind: "resolved", id: 1, from: 5, excerpt: "hello" },
      reactions: [{ emoji: "❤️", count: 1, mine: false }],
      delivery: { kind: "pending", relayed: false },
    });
    expect(thread[2]?.replyTo).toEqual({
      kind: "resolved",
      id: 77,
      from: 8,
      excerpt: "from long ago",
    });
  });

  it("marks a reply to an unknown message unavailable", () => {
    const [only] = buildThread([msg(2, 5, "re", { replyId: 1 })], [], {
      myNodeNum: ME,
    });
    expect(only?.replyTo).toEqual({ kind: "unavailable", id: 1 });
  });

  it("has nothing outgoing before the local node is known", () => {
    const [only] = buildThread([msg(1, ME, "x")], [], { myNodeNum: undefined });
    expect(only?.outgoing).toBe(false);
    expect(only?.delivery).toBeUndefined();
  });
});

describe("missingReplyTargets", () => {
  it("lists reply targets neither in the list nor already known", () => {
    const messages = [
      msg(1, 5, "a"),
      msg(2, 5, "b", { replyId: 1 }),
      msg(3, 5, "c", { replyId: 40 }),
      msg(4, 5, "d", { replyId: 41 }),
      msg(5, 5, "e", { replyId: 40 }),
    ];
    expect(missingReplyTargets(messages, (id) => id === 41)).toEqual([40]);
  });
});

describe("createThreadBuilder", () => {
  it("keeps unchanged bubbles and rebuilds the ones that changed", () => {
    const build = createThreadBuilder();
    const a = msg(1, 5, "a");
    const b = msg(2, 6, "b", { replyId: 1 });
    const like = reaction(2, 7, "👍");
    const first = build([a, b], [like], { myNodeNum: ME });

    const c = msg(3, 5, "c");
    const second = build([a, b, c], [like], { myNodeNum: ME });
    expect(second[0]).toBe(first[0]);
    expect(second[1]).toBe(first[1]);

    const third = build([a, b, c], [like, reaction(1, 8, "❤️")], {
      myNodeNum: ME,
    });
    expect(third[0]).not.toBe(second[0]);
    expect(third[1]).toBe(second[1]);
    expect(third[2]).toBe(second[2]);

    const edited = { ...a, text: "a edited" };
    const fourth = build([edited, b, c], [like], { myNodeNum: ME });
    expect(fourth[1]).not.toBe(third[1]);
    expect(fourth[1]?.replyTo).toMatchObject({ excerpt: "a edited" });

    const fifth = build([edited, b, c], [like], { myNodeNum: 5 });
    expect(fifth[0]).not.toBe(fourth[0]);
    expect(fifth[0]?.outgoing).toBe(true);
  });
});
