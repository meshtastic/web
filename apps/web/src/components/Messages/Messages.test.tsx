import type { MessageActionsAvailability } from "@core/messaging/messageListView.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { type Message, MessageState } from "@core/storage/types.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { testEmojiPrefs } from "@app/tests/emojiPrefs.ts";
import { Composer } from "./Composer.tsx";
import { type BubbleHandlers, MessageBubble } from "./MessageBubble.tsx";
import { ReactionChips } from "./ReactionChips.tsx";

const ME = 1;
const PEER = 7;

const message = (extra: Partial<Message> = {}): Message => ({
  id: 10,
  from: PEER,
  to: ME,
  channel: 0,
  rxTime: new Date(2026, 10, 21, 9, 21),
  type: "direct",
  text: "Thanks, I will check the antenna",
  state: MessageState.Ack,
  ...extra,
});

const ALL: MessageActionsAvailability = {
  react: true,
  reply: true,
  copy: true,
  deliveryDetails: false,
  retry: false,
};

const handlers = (): BubbleHandlers => ({
  setActive: vi.fn(),
  react: vi.fn(),
  reply: vi.fn(),
  copy: vi.fn(),
  deliveryDetails: vi.fn(),
  retry: vi.fn(),
  retryReaction: vi.fn(),
  jumpTo: vi.fn(),
});

const renderBubble = (
  thread: ThreadMessage,
  props: Partial<Parameters<typeof MessageBubble>[0]> = {},
) => {
  const h = props.handlers ?? handlers();
  render(
    <MessageBubble
      thread={thread}
      entryKey={`${thread.message.from}:${thread.message.id}`}
      startsRun
      sender={{ nodeNum: PEER, name: "COULLS_BASE", initials: "0c40" }}
      time="9:21"
      available={ALL}
      active={false}
      highlighted={false}
      touch={false}
      handlers={h}
      locale="en"
      {...props}
    />,
  );
  return h;
};

describe("MessageBubble", () => {
  it("shows an incoming message with sender, hops and its actions trigger", () => {
    renderBubble(
      { message: message({ hopsAway: 2 }), outgoing: false, reactions: [] },
      { meta: { hops: 2, viaMqtt: false, signed: false } },
    );
    expect(screen.getByText("COULLS_BASE")).toBeInTheDocument();
    expect(screen.getByText("2 hops")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "React or reply to COULLS_BASE" }),
    ).toBeInTheDocument();
  });

  it("heads a run with the avatar chip, long name and time above the bubble", () => {
    renderBubble(
      { message: message({ hopsAway: 2 }), outgoing: false, reactions: [] },
      { meta: { hops: 2, viaMqtt: false, signed: false } },
    );
    const row = document.getElementById("msg-7:10");
    const bubble = row?.querySelector("[data-message-bubble]");
    const name = screen.getByText("COULLS_BASE");
    // The header sits above the bubble, not inside it.
    expect(bubble?.contains(name)).toBe(false);
    expect(screen.getByText("0c40")).toBeInTheDocument();
    const time = screen.getByText("9:21");
    expect(time).toHaveAttribute("title", expect.stringContaining("2026"));
    // Hops and the smiley button sit under the bubble.
    expect(bubble?.contains(screen.getByText("2 hops"))).toBe(false);
    expect(row?.contains(screen.getByText("2 hops"))).toBe(true);
  });

  it("leaves the header off later bubbles of a run, but still names the sender", () => {
    renderBubble(
      { message: message(), outgoing: false, reactions: [] },
      { startsRun: false },
    );
    expect(screen.queryByText("COULLS_BASE")).toBeNull();
    expect(screen.queryByText("9:21")).toBeNull();
    expect(screen.getByText("COULLS_BASE:")).toHaveClass("sr-only");
    // The full time stays available to screen readers.
    expect(screen.getByText(/Saturday, November 21, 2026/)).toBeInTheDocument();
  });

  it("shows the signal instead of hops when heard directly", () => {
    renderBubble(
      { message: message({ hopsAway: 0 }), outgoing: false, reactions: [] },
      { meta: { hops: 0, snr: 3.5, viaMqtt: false, signed: false } },
    );
    expect(screen.getByText("SNR 3.5 dB")).toBeInTheDocument();
    expect(screen.queryByText("Direct")).toBeNull();
  });

  it("heads my run with the time only, delivery under the bubble", () => {
    renderBubble(
      { message: message({ from: ME }), outgoing: true, reactions: [] },
      { delivery: { kind: "delivered", proven: false } },
    );
    expect(screen.getByText("9:21")).toBeInTheDocument();
    expect(screen.queryByText("COULLS_BASE")).toBeNull();
    const bubble = document
      .getElementById("msg-1:10")
      ?.querySelector("[data-message-bubble]");
    expect(bubble?.contains(screen.getByText("Delivered"))).toBe(false);
  });

  it.each([
    [{ kind: "delivered", proven: false } as const, "Delivered"],
    [{ kind: "heardBy", count: 3 } as const, "Heard by 3 nodes"],
    [
      { kind: "pending", relayed: false } as const,
      "Waiting for acknowledgement",
    ],
  ])("shows the outgoing delivery state %o", (delivery, text) => {
    renderBubble(
      { message: message({ from: ME }), outgoing: true, reactions: [] },
      { delivery },
    );
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("offers Retry on a failed message and opens delivery details", async () => {
    const user = userEvent.setup();
    const h = renderBubble(
      {
        message: message({ from: ME, state: MessageState.Failed }),
        outgoing: true,
        reactions: [],
        delivery: { kind: "failed" },
      },
      {
        delivery: { kind: "failed", retryable: true },
        available: { ...ALL, retry: true, deliveryDetails: true },
      },
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(h.retry).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Not delivered/ }));
    expect(h.deliveryDetails).toHaveBeenCalledTimes(1);
  });

  it("warns when the delivery proof didn't check out", () => {
    renderBubble(
      { message: message({ from: ME }), outgoing: true, reactions: [] },
      { delivery: { kind: "proofFailed" } },
    );
    expect(screen.getByText("Delivery proof failed")).toBeInTheDocument();
  });

  it("has no Retry for a failure retrying can't fix", () => {
    renderBubble(
      { message: message({ from: ME }), outgoing: true, reactions: [] },
      { delivery: { kind: "failed", retryable: false } },
    );
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("shows unknown hops with a question mark", () => {
    renderBubble(
      { message: message(), outgoing: false, reactions: [] },
      { meta: { viaMqtt: false, signed: false } },
    );
    expect(screen.getByText("? hops")).toBeInTheDocument();
  });

  it("pins the actions bar from the smiley button via the keyboard", async () => {
    const user = userEvent.setup();
    const h = renderBubble({
      message: message(),
      outgoing: false,
      reactions: [],
    });
    screen
      .getByRole("button", { name: "React or reply to COULLS_BASE" })
      .focus();
    await user.keyboard("{Enter}");
    expect(h.setActive).toHaveBeenCalledWith("7:10", true);
  });

  it("renders a reply quote, and an unavailable one", async () => {
    const user = userEvent.setup();
    const h = renderBubble(
      { message: message(), outgoing: false, reactions: [] },
      {
        replyQuote: {
          kind: "resolved",
          name: "You",
          excerpt: "Got you through Big Hill",
          targetKey: "1:5",
        },
      },
    );
    await user.click(
      screen.getByRole("button", { name: /Show original message from You/ }),
    );
    expect(h.jumpTo).toHaveBeenCalledWith("1:5");
  });

  it("says when the original of a reply is unavailable", () => {
    renderBubble(
      { message: message(), outgoing: false, reactions: [] },
      { replyQuote: { kind: "unavailable" } },
    );
    expect(
      screen.getByText("Original message unavailable"),
    ).toBeInTheDocument();
  });
});

describe("ReactionChips", () => {
  it("toggles a chip and marks mine pressed", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ReactionChips
        align="start"
        onToggle={onToggle}
        chips={[
          { emoji: "👍", count: 3, mine: true, fromNodes: [1, 2, 3] },
          { emoji: "❤️", count: 1, mine: false, fromNodes: [2] },
        ]}
      />,
    );
    const mine = screen.getByRole("button", {
      name: "👍 3 reactions, including you",
    });
    expect(mine).toHaveAttribute("aria-pressed", "true");
    const heart = screen.getByRole("button", { name: "❤️ 1 reaction" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    await user.click(heart);
    expect(onToggle).toHaveBeenCalledWith("❤️");
  });

  it("offers a retry for my failed reaction by its packet id", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ReactionChips
        align="end"
        onToggle={vi.fn()}
        onRetry={onRetry}
        chips={[
          {
            emoji: "👍",
            count: 1,
            mine: true,
            fromNodes: [1],
            own: { packetId: 99, state: MessageState.Failed },
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Your reaction wasn't delivered/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send 👍 again" }));
    expect(onRetry).toHaveBeenCalledWith(99);
  });
});

const ComposerHarness = ({
  onSend,
  initial = "",
  replying = false,
}: {
  onSend: (text: string) => void;
  initial?: string;
  replying?: boolean;
}) => {
  const [value, setValue] = useState(initial);
  const [reply, setReply] = useState(replying);
  return (
    <Composer
      label="Message Primary"
      placeholder="Message #Primary"
      hint="Enter to send · Shift+Enter for new line"
      value={value}
      onChange={setValue}
      onSend={(text) => {
        onSend(text);
        setValue("");
      }}
      {...(reply
        ? { replying: { name: "COULLS_BASE", excerpt: "Morning all" } }
        : {})}
      onCancelReply={() => setReply(false)}
      emoji={testEmojiPrefs()}
      onTapback={vi.fn()}
    />
  );
};

describe("Composer", () => {
  it("counts UTF-8 bytes", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness onSend={vi.fn()} />);
    expect(screen.getByText("0/200")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Message Primary"), "héllo");
    expect(screen.getByText("6/200")).toBeInTheDocument();
  });

  it("sends on Enter and keeps Shift+Enter for a newline", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ComposerHarness onSend={onSend} />);
    const field = screen.getByLabelText("Message Primary");
    await user.type(field, "line one{Shift>}{Enter}{/Shift}line two");
    expect(onSend).not.toHaveBeenCalled();
    expect(field).toHaveValue("line one\nline two");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("line one\nline two");
    expect(field).toHaveValue("");
  });

  it("doesn't send while an IME composition is open", () => {
    const onSend = vi.fn();
    render(<ComposerHarness onSend={onSend} initial="こんにちは" />);
    fireEvent.keyDown(screen.getByLabelText("Message Primary"), {
      key: "Enter",
      isComposing: true,
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("blocks sending over 200 bytes and marks the counter", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ComposerHarness onSend={onSend} initial={"é".repeat(101)} />);
    expect(screen.getByText("202/200")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    screen.getByLabelText("Message Primary").focus();
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows the reply strip; Esc and × cancel it", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness onSend={vi.fn()} replying />);
    expect(screen.getByText("Replying to COULLS_BASE")).toBeInTheDocument();
    screen.getByLabelText("Message Primary").focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Replying to COULLS_BASE")).toBeNull();
  });

  it("cancels a reply with its × button", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness onSend={vi.fn()} replying />);
    await user.click(screen.getByRole("button", { name: "Cancel reply" }));
    expect(screen.queryByText("Replying to COULLS_BASE")).toBeNull();
  });
});
