import { type Message, MessageState } from "@core/storage/types.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type BubbleHandlers, MessageBubble } from "./MessageBubble.tsx";
import { MessageText } from "./MessageText.tsx";

const ALICE = 0xffccee11;
const ME = 0x0000beef;

describe("MessageText", () => {
  it("shows a mention by the node's current name", () => {
    const { rerender } = render(
      <MessageText
        text="hi @!ffccee11!"
        mentionName={(num) => (num === ALICE ? "Alice" : undefined)}
      />,
    );
    expect(screen.getByText("@Alice")).toBeInTheDocument();
    expect(screen.queryByText(/@!ffccee11/u)).toBeNull();
    // Renamed: no new message needed, only the id is stored.
    rerender(
      <MessageText
        text="hi @!ffccee11!"
        mentionName={(num) => (num === ALICE ? "Alice Base" : undefined)}
      />,
    );
    expect(screen.getByText("@Alice Base")).toBeInTheDocument();
  });

  it("keeps an unknown node's token as plain text", () => {
    const onOpenNode = vi.fn();
    const { container } = render(
      <MessageText
        text="ask @!12345678 later"
        mentionName={() => undefined}
        onOpenNode={onOpenNode}
      />,
    );
    expect(container.textContent).toBe("ask @!12345678 later");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the node's details on click", async () => {
    const user = userEvent.setup();
    const onOpenNode = vi.fn();
    render(
      <MessageText
        text="@!FFCCEE11 look"
        mentionName={() => "Alice"}
        onOpenNode={onOpenNode}
      />,
    );
    await user.click(screen.getByRole("button", { name: "@Alice" }));
    expect(onOpenNode).toHaveBeenCalledWith(ALICE);
  });

  it("renders names as text, never markup", () => {
    const { container } = render(
      <MessageText
        text="@!ffccee11"
        mentionName={() => "<img src=x onerror=alert(1)>"}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("@<img src=x onerror=alert(1)>");
  });

  it("does not treat a longer id as a mention", () => {
    const { container } = render(
      <MessageText text="@!ffccee11a" mentionName={() => "Alice"} />,
    );
    expect(container.textContent).toBe("@!ffccee11a");
  });
});

describe("MessageBubble with mentions", () => {
  const message = (text: string): Message => ({
    id: 10,
    from: ALICE,
    to: 0xffffffff,
    channel: 0,
    rxTime: new Date(2026, 10, 21, 9, 21),
    type: "broadcast",
    text,
    state: MessageState.Ack,
  });
  const handlers = (openNode = vi.fn()): BubbleHandlers => ({
    setActive: vi.fn(),
    react: vi.fn(),
    reply: vi.fn(),
    copy: vi.fn(),
    deliveryDetails: vi.fn(),
    retry: vi.fn(),
    retryReaction: vi.fn(),
    jumpTo: vi.fn(),
    openNode,
  });
  const renderBubble = (text: string, mentionsMe: boolean, h = handlers()) =>
    render(
      <MessageBubble
        thread={{ message: message(text), outgoing: false, reactions: [] }}
        entryKey="1:10"
        startsRun
        sender={{ nodeNum: ALICE, name: "Alice", initials: "AL" }}
        time="9:21"
        available={{
          react: true,
          reply: true,
          copy: true,
          deliveryDetails: false,
          retry: false,
        }}
        active={false}
        highlighted={false}
        touch={false}
        handlers={h}
        locale="en"
        mentionName={(num) => (num === ME ? "Me Node" : undefined)}
        myNodeNum={ME}
        mentionsMe={mentionsMe}
      />,
    );

  it("stands out, and says so, when it mentions me", () => {
    const { container } = renderBubble("@!0000beef ping", true);
    expect(screen.getByText("Mentions you.")).toBeInTheDocument();
    expect(
      container.querySelector("[data-message-bubble]")?.className,
    ).toContain("bg-accent-tint");
  });

  it("looks like any other message otherwise", () => {
    const { container } = renderBubble("hello", false);
    expect(screen.queryByText("Mentions you.")).toBeNull();
    expect(
      container.querySelector("[data-message-bubble]")?.className,
    ).toContain("bg-raised");
  });

  it("opens a mentioned node through the list's handlers", async () => {
    const user = userEvent.setup();
    const openNode = vi.fn();
    renderBubble("@!0000beef ping", true, handlers(openNode));
    await user.click(screen.getByRole("button", { name: "@Me Node" }));
    expect(openNode).toHaveBeenCalledWith(ME);
  });
});
