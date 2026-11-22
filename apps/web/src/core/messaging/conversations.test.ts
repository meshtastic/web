import {
  type ConversationKey,
  type Message,
  MessageState,
} from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import { filterConversations } from "./conversationList.ts";
import {
  buildSidebarConversations,
  createRowStabilizer,
  EMPTY_SUMMARIES,
  mergeStored,
  sidebarAccessors,
  stabilizeRows,
  totalUnread,
  unreadCounts,
  withMessage,
  withMessagePatched,
  withoutConversation,
  withRead,
} from "./conversations.ts";

const PRIMARY: ConversationKey = { kind: "channel", channel: 0 };
const DM: ConversationKey = { kind: "direct", peer: 7 };

const msg = (id: number, at: number, text = `m${id}`): Message => ({
  id,
  from: 7,
  to: 1,
  channel: 0,
  rxTime: new Date(at),
  type: "direct",
  text,
  state: MessageState.Ack,
});

describe("summary reducers", () => {
  it("tracks the latest message and counts unread", () => {
    let map = withMessage(EMPTY_SUMMARIES, DM, msg(1, 1000), true);
    map = withMessage(map, DM, msg(2, 2000), true);
    map = withMessage(map, PRIMARY, msg(3, 500), false);
    expect(map.get("direct:7")).toEqual({
      key: DM,
      lastMessage: msg(2, 2000),
      unread: 2,
    });
    expect(unreadCounts(map)).toEqual(new Map([["direct:7", 2]]));
    expect(totalUnread(map)).toBe(2);
  });

  it("marks read without touching other conversations", () => {
    const map = withMessage(
      withMessage(EMPTY_SUMMARIES, DM, msg(1, 1), true),
      PRIMARY,
      msg(2, 2),
      true,
    );
    const read = withRead(map, DM);
    expect(read.get("direct:7")?.unread).toBe(0);
    expect(read.get("channel:0")?.unread).toBe(1);
    expect(withRead(read, DM)).toBe(read);
  });

  it("patches the preview when its message changes", () => {
    const map = withMessage(EMPTY_SUMMARIES, DM, msg(1, 1), false);
    const patched = withMessagePatched(map, 1, { state: MessageState.Failed });
    expect(patched.get("direct:7")?.lastMessage?.state).toBe(
      MessageState.Failed,
    );
    expect(withMessagePatched(map, 99, {})).toBe(map);
  });

  it("forgets a cleared conversation", () => {
    const map = withMessage(EMPTY_SUMMARIES, DM, msg(1, 1), true);
    expect(withoutConversation(map, DM).size).toBe(0);
  });

  it("adds what arrived since the load started to the stored counts", () => {
    // A live preview arrived after anything stored, whatever its rxTime.
    const live = withMessage(EMPTY_SUMMARIES, DM, msg(5, 1), true);
    const merged = mergeStored(
      live,
      [
        { key: DM, lastMessage: msg(4, 4000), unread: 3 },
        { key: PRIMARY, lastMessage: msg(2, 2000), unread: 0 },
      ],
      new Map([["direct:7", 1]]),
    );
    expect(merged.get("direct:7")).toMatchObject({
      lastMessage: { id: 5 },
      unread: 4,
    });
    expect(merged.get("channel:0")).toMatchObject({
      lastMessage: { id: 2 },
      unread: 0,
    });
  });

  it("previews the latest arrival even if its radio time is older", () => {
    let map = withMessage(EMPTY_SUMMARIES, DM, msg(1, 2000), false);
    map = withMessage(map, DM, msg(2, 1000), false);
    expect(map.get("direct:7")?.lastMessage?.id).toBe(2);
  });
});

describe("stabilizeRows", () => {
  const rows = (unread: number) =>
    buildSidebarConversations({
      summaries: withMessage(EMPTY_SUMMARIES, DM, msg(1, 1000), unread > 0),
      channels: [{ index: 0, enabled: true }],
      isFavoriteNode: () => false,
    });

  it("returns the previous list when nothing changed", () => {
    const first = rows(1);
    expect(stabilizeRows(first, rows(1))).toBe(first);
  });

  it("reuses unchanged rows and replaces changed ones", () => {
    const first = rows(0);
    const next = stabilizeRows(first, rows(1));
    expect(next).not.toBe(first);
    expect(next[0]).toBe(first[0]);
    expect(next[1]).not.toBe(first[1]);
    expect(next[1]?.unread).toBe(1);
  });

  it("createRowStabilizer remembers the last result", () => {
    const stabilize = createRowStabilizer();
    const first = stabilize(rows(1));
    expect(stabilize(rows(1))).toBe(first);
  });
});

describe("buildSidebarConversations", () => {
  const summaries = withMessage(
    withMessage(EMPTY_SUMMARIES, DM, msg(1, 3000, "hello\nthere"), true),
    { kind: "direct", peer: 8 },
    { ...msg(2, 1000), from: 8 },
    false,
  );

  const rows = buildSidebarConversations({
    summaries,
    channels: [
      { index: 0, enabled: true },
      { index: 1, enabled: false },
      { index: 2, enabled: true },
    ],
    isFavoriteNode: (n) => n === 7,
  });

  it("lists enabled channels, then direct conversations with messages", () => {
    expect(rows.map((r) => r.id)).toEqual([
      "channel:0",
      "channel:2",
      "direct:7",
      "direct:8",
    ]);
    expect(rows[2]).toEqual({
      id: "direct:7",
      key: DM,
      target: { kind: "dm", peer: 7 },
      lastMessage: { from: 7, excerpt: "hello there", rxTime: new Date(3000) },
      unread: 1,
      favorite: true,
    });
    expect(rows[0]).toEqual({
      id: "channel:0",
      key: PRIMARY,
      target: { kind: "channel", channel: 0 },
      unread: 0,
      favorite: false,
    });
  });

  it("hides direct conversations with hidden nodes", () => {
    const visible = buildSidebarConversations({
      summaries,
      channels: [],
      isFavoriteNode: () => false,
      isHiddenNode: (n) => n === 8,
    });
    expect(visible.map((r) => r.id)).toEqual(["direct:7"]);
  });

  it("filters and sorts through sidebarAccessors", () => {
    const title = (r: (typeof rows)[number]) =>
      r.target.kind === "channel"
        ? `Ch ${r.target.channel}`
        : `Node ${r.target.peer}`;
    const accessors = sidebarAccessors(title);
    expect(
      filterConversations(rows, { filter: "all", search: "" }, accessors).map(
        (r) => r.id,
      ),
    ).toEqual(["direct:7", "direct:8", "channel:0", "channel:2"]);
    expect(
      filterConversations(
        rows,
        { filter: "favorites", search: "" },
        accessors,
      ).map((r) => r.id),
    ).toEqual(["direct:7"]);
    expect(
      filterConversations(rows, { filter: "all", search: "there" }, accessors)
        .length,
    ).toBe(1);
  });
});
