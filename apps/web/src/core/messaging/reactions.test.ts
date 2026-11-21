import { describe, expect, it } from "vitest";
import {
  aggregateReactions,
  type ReactionEvent,
  reactionKey,
  toggleReaction,
} from "./reactions.ts";

const ME = 100;

describe("aggregateReactions", () => {
  it("returns no chips without reactions", () => {
    expect(aggregateReactions([], ME)).toEqual([]);
  });

  it("counts distinct nodes per emoji in first-seen order", () => {
    const events: ReactionEvent[] = [
      { emoji: "❤️", fromNode: 1 },
      { emoji: "👍", fromNode: 2 },
      { emoji: "👍", fromNode: 3 },
      { emoji: "❤️", fromNode: 1 },
      { emoji: "😂", fromNode: ME },
      { emoji: "👍", fromNode: ME },
    ];
    expect(aggregateReactions(events, ME)).toEqual([
      { emoji: "❤️", count: 1, mine: false, fromNodes: [1] },
      { emoji: "👍", count: 3, mine: true, fromNodes: [2, 3, ME] },
      { emoji: "😂", count: 1, mine: true, fromNodes: [ME] },
    ]);
  });

  it("keeps order stable when counts change", () => {
    const before = aggregateReactions(
      [
        { emoji: "👍", fromNode: 1 },
        { emoji: "❤️", fromNode: 2 },
      ],
      ME,
    );
    const after = aggregateReactions(
      [
        { emoji: "👍", fromNode: 1 },
        { emoji: "❤️", fromNode: 2 },
        { emoji: "❤️", fromNode: 3 },
        { emoji: "❤️", fromNode: 4 },
      ],
      ME,
    );
    expect(before.map((c) => c.emoji)).toEqual(after.map((c) => c.emoji));
  });

  it("ignores empty emoji and an unknown local node", () => {
    const chips = aggregateReactions(
      [
        { emoji: "", fromNode: 1 },
        { emoji: "👍", fromNode: ME },
      ],
      undefined,
    );
    expect(chips).toEqual([
      { emoji: "👍", count: 1, mine: false, fromNodes: [ME] },
    ]);
  });
});

describe("emoji variation selectors", () => {
  it("groups ❤ and ❤️ (with U+FE0F) into one reaction", () => {
    expect("❤️").not.toBe("❤");
    const chips = aggregateReactions(
      [
        { emoji: "❤️", fromNode: 1 },
        { emoji: "❤", fromNode: 2 },
        { emoji: "❤", fromNode: ME },
      ],
      ME,
    );
    expect(chips).toEqual([
      { emoji: "❤️", count: 3, mine: true, fromNodes: [1, 2, ME] },
    ]);
  });

  it("toggles off my reaction whichever spelling is clicked", () => {
    const result = toggleReaction([{ emoji: "❤", fromNode: ME }], "❤️", ME);
    expect(result).toEqual({ action: "remove", events: [] });
  });

  it("ignores an emoji that is only a variation selector", () => {
    expect(aggregateReactions([{ emoji: "\uFE0F", fromNode: 1 }], ME)).toEqual(
      [],
    );
  });

  it("reactionKey strips U+FE0F only", () => {
    expect(reactionKey("‼️")).toBe("‼");
    expect(reactionKey("👍🏽")).toBe("👍🏽");
  });
});

describe("toggleReaction", () => {
  const events: ReactionEvent[] = [
    { emoji: "👍", fromNode: 1 },
    { emoji: "👍", fromNode: ME },
  ];

  it("removes my reaction when I already sent it", () => {
    const result = toggleReaction(events, "👍", ME);
    expect(result.action).toBe("remove");
    expect(result.events).toEqual([{ emoji: "👍", fromNode: 1 }]);
  });

  it("adds my reaction otherwise", () => {
    const result = toggleReaction(events, "❤️", ME);
    expect(result.action).toBe("add");
    expect(aggregateReactions(result.events, ME).at(-1)).toEqual({
      emoji: "❤️",
      count: 1,
      mine: true,
      fromNodes: [ME],
    });
  });

  it("does not mutate the input", () => {
    const copy = [...events];
    toggleReaction(events, "👍", ME);
    toggleReaction(events, "😮", ME);
    expect(events).toEqual(copy);
  });

  it("round-trips", () => {
    const added = toggleReaction(events, "😮", ME);
    const removed = toggleReaction(added.events, "😮", ME);
    expect(removed.events).toEqual(events);
  });
});
