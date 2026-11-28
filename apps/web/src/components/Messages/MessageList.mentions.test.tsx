import { testEmojiPrefs } from "@app/tests/emojiPrefs.ts";
import { buildTimeline } from "@core/messaging/messageListView.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { type Message, MessageState } from "@core/storage/types.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageList, type MessageListHandlers } from "./MessageList.tsx";

const ME = 0x0000beef;
const PEER = 0xffccee11;
const base = new Date(2026, 10, 21, 9, 0).getTime();

const thread = (
  id: number,
  text: string,
  extra: Partial<ThreadMessage> = {},
): ThreadMessage => {
  const from = extra.outgoing ? ME : PEER;
  const message: Message = {
    id,
    from,
    to: 0xffffffff,
    channel: 0,
    rxTime: new Date(base + id * 60_000),
    type: "broadcast",
    text,
    state: MessageState.Ack,
  };
  return { message, outgoing: false, reactions: [], ...extra };
};

const names = new Map([
  [ME, "Base Camp"],
  [PEER, "Alice"],
]);

const setup = (threads: readonly ThreadMessage[]) => {
  const openNode = vi.fn();
  const handlers: MessageListHandlers = {
    react: vi.fn(),
    reply: vi.fn(),
    copy: vi.fn(),
    deliveryDetails: vi.fn(),
    retry: vi.fn(),
    retryReaction: vi.fn(),
    openNode,
  };
  render(
    <MessageList
      label="Messages"
      entries={buildTimeline(threads, [])}
      variant="channel"
      connected
      sender={(nodeNum) => ({
        nodeNum,
        name: names.get(nodeNum) ?? "?",
        initials: "N",
      })}
      quoteName={(nodeNum) => names.get(nodeNum) ?? "?"}
      nameOf={(nodeNum) => names.get(nodeNum) ?? "?"}
      formatTime={(date) => date.toISOString()}
      dayLabel={() => "Today"}
      loadOlder={() => Promise.resolve(0)}
      handlers={handlers}
      emoji={testEmojiPrefs()}
      touch={false}
      locale="en"
      mentionName={(num) => names.get(num)}
      myNodeNum={ME}
    />,
  );
  return { openNode };
};

const bubbleOf = (key: string) =>
  document.getElementById(`msg-${key}`)?.querySelector("[data-message-bubble]");

describe("MessageList @mentions", () => {
  it("highlights incoming messages that mention me, not others", () => {
    setup([
      thread(1, "@!0000BEEF are you there?"),
      thread(2, "@!ffccee11 talking to myself"),
      thread(3, "@!0000beefa is someone else"),
    ]);
    expect(bubbleOf(`${PEER}:1`)?.className).toContain("bg-accent-tint");
    expect(bubbleOf(`${PEER}:2`)?.className).not.toContain("bg-accent-tint");
    expect(bubbleOf(`${PEER}:3`)?.className).not.toContain("bg-accent-tint");
    expect(screen.getAllByText("Mentions you.")).toHaveLength(1);
  });

  it("names mentions in reply quotes", () => {
    setup([
      thread(1, "ping @!0000beef"),
      thread(2, "pong", {
        replyTo: {
          kind: "resolved",
          id: 1,
          from: PEER,
          excerpt: "ping @!0000beef",
        },
      }),
    ]);
    expect(
      screen.getByRole("button", { name: /Show original message/u }),
    ).toHaveTextContent("ping @Base Camp");
  });

  it("opens the mentioned node", async () => {
    const user = userEvent.setup();
    const { openNode } = setup([thread(1, "hey @!ffccee11")]);
    await user.click(screen.getByRole("button", { name: "@Alice" }));
    expect(openNode).toHaveBeenCalledWith(PEER);
  });
});
