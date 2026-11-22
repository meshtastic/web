import { buildTimeline } from "@core/messaging/messageListView.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { type Message, MessageState } from "@core/storage/types.ts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { testEmojiPrefs } from "@app/tests/emojiPrefs.ts";
import { MessageList, type MessageListHandlers } from "./MessageList.tsx";
import { LONG_PRESS_MS } from "./useLongPress.ts";

const ME = 1;
const PEER = 7;
const base = new Date(2026, 10, 21, 9, 0).getTime();

const thread = (id: number, from = PEER): ThreadMessage => {
  const message: Message = {
    id,
    from,
    to: from === ME ? PEER : ME,
    channel: 0,
    rxTime: new Date(base + id * 60_000),
    type: "direct",
    text: `message ${id}`,
    state: MessageState.Ack,
  };
  return { message, outgoing: from === ME, reactions: [] };
};

const setup = (threads: readonly ThreadMessage[]) => {
  const handlers: MessageListHandlers = {
    react: vi.fn(),
    reply: vi.fn(),
    copy: vi.fn(),
    deliveryDetails: vi.fn(),
    retry: vi.fn(),
    retryReaction: vi.fn(),
  };
  render(
    <MessageList
      label="Messages"
      entries={buildTimeline(threads, [])}
      variant="channel"
      connected
      sender={(nodeNum) => ({
        nodeNum,
        name: `Node ${nodeNum}`,
        initials: "N7",
      })}
      quoteName={(nodeNum) => `Node ${nodeNum}`}
      nameOf={(nodeNum) => `Node ${nodeNum}`}
      formatTime={(date) => date.toISOString()}
      dayLabel={() => "Today"}
      loadOlder={() => Promise.resolve(0)}
      handlers={handlers}
      emoji={testEmojiPrefs()}
      touch={false}
      locale="en"
    />,
  );
  return handlers;
};

const row = (key: string) => {
  const el = document.getElementById(`msg-${key}`);
  if (!el) {
    throw new Error(`no row ${key}`);
  }
  return el;
};
const item = (key: string) => {
  const li = row(key).closest("li");
  if (!li) {
    throw new Error(`no list item for ${key}`);
  }
  return li;
};
const toolbars = () =>
  screen.queryAllByRole("toolbar", { name: "Message actions" });

describe("MessageList actions bar", () => {
  it("renders one bar for the whole list, on the hovered message", async () => {
    const user = userEvent.setup();
    setup([thread(1), thread(2)]);
    expect(toolbars()).toHaveLength(0);

    await user.hover(row("7:1"));
    expect(toolbars()).toHaveLength(1);
    expect(item("7:1")).toHaveAttribute("data-bar-target");
    expect(row("7:1").contains(toolbars()[0] ?? null)).toBe(true);

    await user.hover(row("7:2"));
    expect(toolbars()).toHaveLength(1);
    expect(item("7:1")).not.toHaveAttribute("data-bar-target");
    expect(item("7:2")).toHaveAttribute("data-bar-target");
    expect(row("7:2").contains(toolbars()[0] ?? null)).toBe(true);
  });

  it("pins from the keyboard, focuses the bar, and Escape returns focus", async () => {
    const user = userEvent.setup();
    setup([thread(1), thread(2)]);
    // The second message's smiley button.
    const second = screen.getAllByRole("button", {
      name: "React or reply to Node 7",
    })[1];
    if (!second) {
      throw new Error("no smiley button");
    }
    second.focus();
    await user.keyboard("{Enter}");

    const bar = screen.getByRole("toolbar", { name: "Message actions" });
    expect(row("7:2").contains(bar)).toBe(true);
    expect(bar.parentElement).toHaveAttribute("data-pinned");
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(
      within(bar).getByRole("button", { name: "React with 👍" }),
    ).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(
      within(bar).getByRole("button", { name: "More actions" }),
    ).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-expanded", "false");
    // Closed, not merely unpinned: focus back on the smiley doesn't keep it.
    expect(toolbars()).toHaveLength(0);
  });

  it("reaches the bar with Tab from a message's smiley button", async () => {
    const user = userEvent.setup();
    setup([thread(1)]);
    screen.getByRole("button", { name: "React or reply to Node 7" }).focus();
    await user.tab();
    expect(
      within(
        screen.getByRole("toolbar", { name: "Message actions" }),
      ).getByRole("button", { name: "React with 👍" }),
    ).toHaveFocus();
  });

  it("pins the bar on a long-press", () => {
    vi.useFakeTimers();
    try {
      setup([thread(1), thread(2)]);
      fireEvent.pointerDown(row("7:2"), {
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      });
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS + 50);
      });
      expect(toolbars()).toHaveLength(1);
      expect(toolbars()[0]?.parentElement).toHaveAttribute("data-pinned");
      expect(row("7:2").contains(toolbars()[0] ?? null)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a pinned bar on its message while the pointer moves on", async () => {
    const user = userEvent.setup();
    setup([thread(1), thread(2)]);
    const first = screen.getAllByRole("button", {
      name: "React or reply to Node 7",
    })[0];
    if (!first) {
      throw new Error("no smiley button");
    }
    await user.click(first);
    await user.hover(row("7:2"));
    expect(toolbars()).toHaveLength(1);
    expect(row("7:1").contains(toolbars()[0] ?? null)).toBe(true);

    // A click elsewhere closes it; then hover moves it again.
    await user.click(document.body);
    expect(toolbars()[0]?.parentElement).not.toHaveAttribute("data-pinned");
    await user.hover(row("7:2"));
    expect(row("7:2").contains(toolbars()[0] ?? null)).toBe(true);
  });

  it("acts on the bar's message: reply and react", async () => {
    const user = userEvent.setup();
    const handlers = setup([thread(1), thread(2, ME)]);
    await user.hover(row("1:2"));
    const bar = screen.getByRole("toolbar", { name: "Message actions" });
    await user.click(within(bar).getByRole("button", { name: "Reply" }));
    expect(handlers.reply).toHaveBeenCalledWith(
      expect.objectContaining({ outgoing: true }),
    );
    await user.hover(row("7:1"));
    await user.click(
      within(
        screen.getByRole("toolbar", { name: "Message actions" }),
      ).getByRole("button", { name: "React with 👍" }),
    );
    expect(handlers.react).toHaveBeenCalledWith(
      expect.objectContaining({ outgoing: false }),
      "👍",
    );
    await act(() => Promise.resolve());
  });
});
