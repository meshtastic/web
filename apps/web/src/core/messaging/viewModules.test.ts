import { MessageState } from "@core/storage/types.ts";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  channelEncryption,
  isPrivatelyEncrypted,
  recentlyHeard,
  recentlyHeardOn,
} from "./channelInfo.ts";
import {
  CHAT_TEXT_LIMIT,
  composerKeyAction,
  composerStatus,
} from "./composer.ts";
import type { SidebarConversation } from "./conversations.ts";
import { deliveryLine, deliveryStatus } from "./deliveryView.ts";
import {
  nextGridIndex,
  nextToolbarIndex,
  pickerEmoji,
  quickReactions,
} from "./emojiPicker.ts";
import {
  decideOnAppend,
  diffList,
  distanceFromBottom,
  isAtBottom,
  preservedScrollTop,
  shouldLoadOlder,
} from "./scrollAnchor.ts";
import { mixedRows, previewAuthor, sidebarSections } from "./sidebarView.ts";
import {
  toTracerouteView,
  traceroutesForPeer,
  UNKNOWN_SNR,
} from "./tracerouteView.ts";

describe("composer", () => {
  it("counts UTF-8 bytes against 200", () => {
    expect(CHAT_TEXT_LIMIT).toEqual({ max: 200, mode: "bytes", trim: true });
    expect(composerStatus("héllo")).toEqual({
      used: 6,
      over: false,
      canSend: true,
    });
    const atLimit = "a".repeat(200);
    expect(composerStatus(atLimit).canSend).toBe(true);
    const over = `${"a".repeat(199)}é`;
    expect(composerStatus(over)).toEqual({
      used: 201,
      over: true,
      canSend: false,
    });
  });

  it("can't send whitespace", () => {
    expect(composerStatus("  \n ").canSend).toBe(false);
    // Counted like sent text: surrounding whitespace doesn't count.
    expect(composerStatus("  hi  ").used).toBe(2);
    expect(composerStatus("").canSend).toBe(false);
  });

  it("maps keys: Enter sends, Shift+Enter is a newline, Esc cancels a reply", () => {
    const base = { shiftKey: false, isComposing: false, replying: false };
    expect(composerKeyAction({ ...base, key: "Enter" })).toBe("send");
    expect(composerKeyAction({ ...base, key: "Enter", shiftKey: true })).toBe(
      "default",
    );
    expect(
      composerKeyAction({ ...base, key: "Enter", isComposing: true }),
    ).toBe("default");
    expect(composerKeyAction({ ...base, key: "Escape" })).toBe("default");
    expect(composerKeyAction({ ...base, key: "Escape", replying: true })).toBe(
      "cancelReply",
    );
    expect(composerKeyAction({ ...base, key: "a" })).toBe("default");
  });
});

describe("scrollAnchor", () => {
  const metrics = (scrollTop: number) => ({
    scrollTop,
    scrollHeight: 1000,
    clientHeight: 400,
  });

  it("measures distance from the end", () => {
    expect(distanceFromBottom(metrics(600))).toBe(0);
    expect(distanceFromBottom(metrics(500))).toBe(100);
    expect(isAtBottom(metrics(560))).toBe(true);
    expect(isAtBottom(metrics(500))).toBe(false);
  });

  it("sticks when at the bottom or after my own send, else notifies", () => {
    const base = { wasAtBottom: false, lastIsMine: false, pending: 0 };
    expect(decideOnAppend({ ...base, appended: 0 })).toEqual({
      kind: "none",
    });
    expect(decideOnAppend({ ...base, appended: 1, wasAtBottom: true })).toEqual(
      { kind: "stick" },
    );
    expect(decideOnAppend({ ...base, appended: 1, lastIsMine: true })).toEqual({
      kind: "stick",
    });
    expect(decideOnAppend({ ...base, appended: 2, pending: 3 })).toEqual({
      kind: "notify",
      count: 5,
    });
  });

  it("diffs key lists into prepends, appends and resets", () => {
    expect(diffList([], ["a"])).toEqual({
      prepended: 0,
      appended: 0,
      reset: true,
    });
    expect(diffList([], [])).toEqual({
      prepended: 0,
      appended: 0,
      reset: false,
    });
    expect(diffList(["b", "c"], ["a", "b", "c", "d", "e"])).toEqual({
      prepended: 1,
      appended: 2,
      reset: false,
    });
    expect(diffList(["b"], ["x", "y"])).toEqual({
      prepended: 0,
      appended: 0,
      reset: true,
    });
  });

  it("keeps content in place when history is inserted above", () => {
    expect(preservedScrollTop(10, 1000, 1600)).toBe(610);
    expect(preservedScrollTop(0, 1000, 900)).toBe(0);
  });

  it("loads older near the top unless busy or exhausted", () => {
    expect(
      shouldLoadOlder({ scrollTop: 50, loading: false, exhausted: false }),
    ).toBe(true);
    expect(
      shouldLoadOlder({ scrollTop: 500, loading: false, exhausted: false }),
    ).toBe(false);
    expect(
      shouldLoadOlder({ scrollTop: 0, loading: true, exhausted: false }),
    ).toBe(false);
    expect(
      shouldLoadOlder({ scrollTop: 0, loading: false, exhausted: true }),
    ).toBe(false);
  });
});

describe("emojiPicker", () => {
  it("has the five quick tapbacks in the Android order", () => {
    expect(quickReactions.map((q) => q.emoji)).toEqual([
      "👍",
      "❤️",
      "😂",
      "😮",
      "‼️",
    ]);
    expect(new Set(pickerEmoji).size).toBe(pickerEmoji.length);
  });

  it("moves along a toolbar with wrap-around", () => {
    expect(nextToolbarIndex(0, "ArrowLeft", 4)).toBe(3);
    expect(nextToolbarIndex(3, "ArrowRight", 4)).toBe(0);
    expect(nextToolbarIndex(2, "Home", 4)).toBe(0);
    expect(nextToolbarIndex(1, "End", 4)).toBe(3);
    expect(nextToolbarIndex(1, "Tab", 4)).toBeUndefined();
    expect(nextToolbarIndex(0, "ArrowRight", 0)).toBeUndefined();
  });

  it("moves around a grid, staying put at the edges", () => {
    // 10 items in rows of 4: 0-3, 4-7, 8-9.
    expect(nextGridIndex(0, "ArrowLeft", 4, 10)).toBe(0);
    expect(nextGridIndex(3, "ArrowRight", 4, 10)).toBe(4);
    expect(nextGridIndex(9, "ArrowRight", 4, 10)).toBe(9);
    expect(nextGridIndex(1, "ArrowDown", 4, 10)).toBe(5);
    expect(nextGridIndex(6, "ArrowDown", 4, 10)).toBe(6);
    expect(nextGridIndex(5, "ArrowUp", 4, 10)).toBe(1);
    expect(nextGridIndex(1, "ArrowUp", 4, 10)).toBe(1);
    expect(nextGridIndex(6, "Home", 4, 10)).toBe(4);
    expect(nextGridIndex(8, "End", 4, 10)).toBe(9);
    expect(nextGridIndex(0, "x", 4, 10)).toBeUndefined();
  });
});

describe("channelInfo", () => {
  it("names the encryption by key length", () => {
    expect(channelEncryption(undefined)).toBe("none");
    expect(channelEncryption(new Uint8Array(0))).toBe("none");
    expect(channelEncryption(new Uint8Array(1))).toBe("defaultKey");
    expect(channelEncryption(new Uint8Array(16))).toBe("aes128");
    expect(channelEncryption(new Uint8Array(32))).toBe("aes256");
    expect(isPrivatelyEncrypted("aes128")).toBe(true);
    expect(isPrivatelyEncrypted("defaultKey")).toBe(false);
  });

  const now = 10_000_000;
  const nodes = [
    { num: 1, isSelf: true, channel: 0, lastHeardMs: now },
    { num: 2, isSelf: false, channel: 0, lastHeardMs: now - 60_000 },
    { num: 3, isSelf: false, channel: 1, lastHeardMs: now - 1_000 },
    { num: 4, isSelf: false, lastHeardMs: now - 10 },
    { num: 5, isSelf: false, channel: 0, lastHeardMs: now - 3 * 3_600_000 },
    { num: 6, isSelf: false, channel: 0 },
  ];

  it("lists nodes heard on a channel recently, newest first", () => {
    expect(recentlyHeardOn(nodes, 0, now).map((n) => n.num)).toEqual([4, 2]);
    expect(recentlyHeardOn(nodes, 1, now).map((n) => n.num)).toEqual([3]);
  });

  it("lists the most recently heard nodes overall", () => {
    expect(recentlyHeard(nodes, 3).map((n) => n.num)).toEqual([4, 3, 2]);
    expect(recentlyHeard(nodes, 0)).toEqual([]);
  });
});

describe("sidebarView", () => {
  const row = (
    id: string,
    target: SidebarConversation["target"],
    extra: Partial<SidebarConversation> = {},
  ): SidebarConversation => ({
    id,
    key:
      target.kind === "channel"
        ? { kind: "channel", channel: target.channel }
        : { kind: "direct", peer: target.peer },
    target,
    unread: 0,
    favorite: false,
    ...extra,
  });
  const last = (from: number, ms: number) => ({
    from,
    excerpt: "hi",
    rxTime: new Date(ms),
  });
  const rows = [
    row("channel:0", { kind: "channel", channel: 0 }),
    row(
      "channel:1",
      { kind: "channel", channel: 1 },
      { lastMessage: last(5, 300), unread: 2 },
    ),
    row(
      "direct:5",
      { kind: "dm", peer: 5 },
      { lastMessage: last(5, 200), favorite: true },
    ),
    row(
      "direct:6",
      { kind: "dm", peer: 6 },
      { lastMessage: last(1, 400), unread: 1 },
    ),
  ];
  const title = (r: SidebarConversation) => r.id;

  it("splits rows into channels (slot order) and DMs (recent first)", () => {
    const all = sidebarSections(rows, "all", title, {
      keepChannelOrder: true,
    });
    expect(all.channels.map((r) => r.id)).toEqual(["channel:0", "channel:1"]);
    expect(all.direct.map((r) => r.id)).toEqual(["direct:6", "direct:5"]);
    const unread = sidebarSections(rows, "unread", title);
    expect(unread.channels.map((r) => r.id)).toEqual(["channel:1"]);
    expect(unread.direct.map((r) => r.id)).toEqual(["direct:6"]);
    const fav = sidebarSections(rows, "favorites", title);
    expect(fav.channels).toEqual([]);
    expect(fav.direct.map((r) => r.id)).toEqual(["direct:5"]);
  });

  it("mixes rows by recency for the narrow list, with a channels chip", () => {
    expect(mixedRows(rows, "all", title).map((r) => r.id)).toEqual([
      "direct:6",
      "channel:1",
      "direct:5",
      "channel:0",
    ]);
    expect(mixedRows(rows, "channels", title).map((r) => r.id)).toEqual([
      "channel:1",
      "channel:0",
    ]);
  });

  it("prefixes previews by author", () => {
    const [ch0, ch1, dm5, dm6] = rows;
    if (!ch0 || !ch1 || !dm5 || !dm6) throw new Error("fixture");
    expect(previewAuthor(ch0, 1)).toEqual({ kind: "none" });
    expect(previewAuthor(ch1, 1)).toEqual({ kind: "sender", nodeNum: 5 });
    expect(previewAuthor(dm5, 1)).toEqual({ kind: "none" });
    expect(previewAuthor(dm6, 1)).toEqual({ kind: "me" });
    expect(previewAuthor(dm6, undefined)).toEqual({ kind: "none" });
  });
});

describe("tracerouteView", () => {
  const packet = {
    id: 42,
    from: 7,
    to: 1,
    rxTime: new Date(5000),
    data: {
      route: [3],
      routeBack: [3],
      snrTowards: [-18, -36],
      snrBack: [UNKNOWN_SNR, 8],
    },
  };

  it("builds the path from origin to destination with SNR in dB", () => {
    expect(toTracerouteView(packet)).toEqual({
      id: 42,
      from: 7,
      at: new Date(5000),
      path: [1, 3, 7],
      snrTowards: [-4.5, -9],
      pathBack: [7, 3, 1],
      snrBack: [undefined, 2],
      sameReturn: true,
    });
  });

  it("has no return path when none came back", () => {
    const view = toTracerouteView({
      ...packet,
      data: { route: [], routeBack: [], snrTowards: [4], snrBack: [] },
    });
    expect(view.path).toEqual([1, 7]);
    expect(view.pathBack).toEqual([]);
    expect(view.sameReturn).toBe(false);
  });

  it("notices a different return path", () => {
    const view = toTracerouteView({
      ...packet,
      data: { ...packet.data, routeBack: [9] },
    });
    expect(view.sameReturn).toBe(false);
  });

  it("selects one peer's results, oldest first", () => {
    const later = { ...packet, id: 43, rxTime: new Date(9000) };
    const map = new Map([[7, [later, packet]]]);
    expect(traceroutesForPeer(map, 7).map((v) => v.id)).toEqual([42, 43]);
    expect(traceroutesForPeer(map, 8)).toEqual([]);
  });
});

describe("deliveryView", () => {
  const msg = {
    state: MessageState.Ack,
    type: "direct" as const,
  };

  it("maps delivery states to the line under the bubble", () => {
    expect(deliveryLine({ kind: "delivered" }, msg)).toEqual({
      kind: "delivered",
      proven: false,
    });
    expect(
      deliveryLine(
        { kind: "delivered" },
        {
          ...msg,
          ackProof: Protobuf.Mesh.MeshPacket_AckProofStatus.ACK_PROOF_VALID,
        },
      ),
    ).toEqual({ kind: "delivered", proven: true });
    expect(
      deliveryLine(
        { kind: "delivered" },
        {
          ...msg,
          ackProof: Protobuf.Mesh.MeshPacket_AckProofStatus.ACK_PROOF_INVALID,
        },
      ),
    ).toEqual({ kind: "proofFailed" });
    expect(deliveryLine({ kind: "heardBy", count: 3 }, msg)).toEqual({
      kind: "heardBy",
      count: 3,
    });
    expect(
      deliveryLine(
        { kind: "pending", relayed: true },
        {
          ...msg,
          state: MessageState.Delivered,
        },
      ),
    ).toEqual({ kind: "pending", relayed: true });
  });

  it("gives a failure's reason and whether retrying can help", () => {
    const E = Protobuf.Mesh.Routing_Error;
    expect(
      deliveryLine(
        { kind: "failed" },
        { ...msg, state: MessageState.Failed, routingError: E.NO_ROUTE },
      ),
    ).toEqual({ kind: "failed", reasonKey: "error.noRoute", retryable: true });
    expect(
      deliveryLine(
        { kind: "failed" },
        { ...msg, state: MessageState.Failed, routingError: E.TOO_LARGE },
      ),
    ).toEqual({
      kind: "failed",
      reasonKey: "error.tooLarge",
      retryable: false,
    });
    expect(
      deliveryLine({ kind: "failed" }, { ...msg, state: MessageState.Failed }),
    ).toEqual({ kind: "failed", retryable: true });
  });

  it("feeds the details dialog the full status", () => {
    expect(
      deliveryStatus({ state: MessageState.Pending, type: "broadcast" })
        .textKey,
    ).toBe("enroute");
  });
});

describe("announcer", () => {
  it("reads one message out and summarises a batch", async () => {
    const { summarizeIncoming } = await import("./announcer.ts");
    expect(summarizeIncoming([])).toBeUndefined();
    expect(summarizeIncoming([{ from: 7, text: "hi" }])).toEqual({
      kind: "one",
      from: 7,
      text: "hi",
    });
    expect(
      summarizeIncoming([
        { from: 7, text: "a" },
        { from: 8, text: "b" },
      ]),
    ).toEqual({ kind: "many", count: 2 });
  });

  it("waits out the interval after an announcement", async () => {
    const { announceDelay } = await import("./announcer.ts");
    expect(announceDelay(undefined, 1000)).toBe(0);
    expect(announceDelay(1000, 1500, 2000)).toBe(1500);
    expect(announceDelay(1000, 5000, 2000)).toBe(0);
  });
});

describe("signalTone", () => {
  it("maps ratings to status colours", async () => {
    const { signalTone } = await import("./messageListView.ts");
    expect(signalTone("good")).toBe("text-accent");
    expect(signalTone("fair")).toBe("text-warning");
    expect(signalTone("bad")).toBe("text-danger");
    expect(signalTone("none")).toBe("text-danger");
  });
});
