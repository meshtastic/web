import { SendTextError } from "@core/kmp/chat.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { type Message, MessageState } from "@core/storage/types.ts";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationThread } from "./ConversationThread.tsx";

const env = vi.hoisted(() => ({
  messages: new Array<ThreadMessage>(),
  sendText: vi.fn(),
  retry: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@core/kmp/hooks", async () => {
  const { useState } = await import("react");
  return {
    useThread: () => ({
      messages: env.messages,
      loadOlder: () => Promise.resolve([]),
    }),
    useDraft: () => {
      const [text, setText] = useState("");
      return { text, setText, clear: () => setText("") };
    },
    useMessagingActions: () => ({
      sendText: env.sendText,
      retry: env.retry,
      toggleReaction: vi.fn(() => Promise.resolve(Result.ok({}))),
    }),
  };
});

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: env.toast }),
}));

const incoming: Message = {
  id: 10,
  from: 7,
  to: 1,
  channel: 0,
  rxTime: new Date(2026, 10, 21, 9, 0),
  type: "direct",
  text: "Antenna is up",
  state: MessageState.Ack,
};

const renderThread = (
  relayLabel?: (relayNode: number | undefined) => string | undefined,
) =>
  render(
    <ConversationThread
      conversation={{ kind: "direct", peer: 7 }}
      title="COULLS_BASE"
      hint=""
      destination={7}
      channel={0}
      connected
      traceroutes={[]}
      sender={(nodeNum) => ({ nodeNum, name: "COULLS_BASE", initials: "CB" })}
      nameOf={() => "COULLS_BASE"}
      {...(relayLabel ? { relayLabel } : {})}
      myNodeNum={1}
      muted={false}
      touch={false}
      confirmClear={false}
      onConfirmClearChange={vi.fn()}
      onClear={vi.fn()}
    />,
  );

const fail = () =>
  Promise.resolve(Result.err(new SendTextError("not-connected")));

beforeEach(() => {
  env.messages = [{ message: incoming, outgoing: false, reactions: [] }];
  env.sendText.mockReset();
  env.retry.mockReset();
  env.toast.mockReset();
});

describe("ConversationThread sending", () => {
  it("sends with the reply target and clears the composer", async () => {
    const user = userEvent.setup();
    env.sendText.mockResolvedValue(Result.ok(99));
    renderThread();
    // The list's one actions bar opens on a message (here: its smiley).
    fireEvent.click(screen.getByRole("button", { name: /^React or reply/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    expect(screen.getByText("Replying to COULLS_BASE")).toBeInTheDocument();
    const field = screen.getByLabelText("Message COULLS_BASE");
    await user.type(field, "On my way{Enter}");
    expect(env.sendText).toHaveBeenCalledWith({
      text: "On my way",
      destination: 7,
      channel: 0,
      replyId: 10,
    });
    expect(field).toHaveValue("");
    expect(screen.queryByText("Replying to COULLS_BASE")).toBeNull();
  });

  it("restores the text and reply target when sending fails", async () => {
    const user = userEvent.setup();
    env.sendText.mockImplementation(fail);
    renderThread();
    // The list's one actions bar opens on a message (here: its smiley).
    fireEvent.click(screen.getByRole("button", { name: /^React or reply/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reply" }));
    const field = screen.getByLabelText("Message COULLS_BASE");
    await user.type(field, "On my way{Enter}");
    await act(() => Promise.resolve());
    expect(field).toHaveValue("On my way");
    expect(screen.getByText("Replying to COULLS_BASE")).toBeInTheDocument();
    expect(env.toast).toHaveBeenCalledWith({ title: "Message not sent" });
  });

  it("doesn't overwrite newer typing with the failed text", async () => {
    const user = userEvent.setup();
    let reject: () => void = () => {};
    env.sendText.mockImplementation(
      () =>
        new Promise((resolve) => {
          reject = () =>
            resolve(Result.err(new SendTextError("not-connected")));
        }),
    );
    renderThread();
    const field = screen.getByLabelText("Message COULLS_BASE");
    await user.type(field, "first{Enter}");
    await user.type(field, "second");
    await act(async () => reject());
    expect(field).toHaveValue("second");
    expect(env.toast).toHaveBeenCalled();
  });
});

describe("ConversationThread delivery details", () => {
  it("resends through retry and reports a failure", async () => {
    const user = userEvent.setup();
    env.retry.mockImplementation(fail);
    env.messages = [
      {
        message: {
          ...incoming,
          id: 11,
          from: 1,
          to: 7,
          state: MessageState.Failed,
        },
        outgoing: true,
        reactions: [],
        delivery: { kind: "failed" },
      },
    ];
    renderThread();
    await user.click(screen.getByRole("button", { name: /Not delivered/ }));
    await user.click(screen.getByRole("button", { name: "Resend" }));
    await act(() => Promise.resolve());
    expect(env.retry).toHaveBeenCalledWith(11);
    expect(env.toast).toHaveBeenCalledWith({ title: "Couldn't send again" });
  });

  it("names the node that relayed a received message", async () => {
    const user = userEvent.setup();
    env.messages = [
      {
        message: { ...incoming, relayNode: 0x5a, hopsAway: 2 },
        outgoing: false,
        reactions: [],
      },
    ];
    const relayLabel = vi.fn((relay: number | undefined) =>
      relay === 0x5a ? "Ridge (0x5A)" : undefined,
    );
    renderThread(relayLabel);
    fireEvent.click(screen.getByRole("button", { name: /^React or reply/ }));
    await user.click(screen.getByRole("button", { name: "More actions" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Delivery details" }),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Relayed by Ridge (0x5A)",
    );
    expect(relayLabel).toHaveBeenCalledWith(0x5a);
  });
});
