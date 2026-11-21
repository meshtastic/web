import { buildTimeline } from "@core/messaging/messageListView.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { type Message, MessageState } from "@core/storage/types.ts";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList, type MessageListHandlers } from "./MessageList.tsx";

const renders = vi.hoisted(() => ({ keys: new Array<string>() }));

// Counts bubble renders; memo() like the real bubble.
vi.mock("./MessageBubble.tsx", async () => {
  const { memo } = await import("react");
  return {
    MessageBubble: memo(function BubbleStub(props: { entryKey: string }) {
      renders.keys.push(props.entryKey);
      return <div id={`msg-${props.entryKey}`}>{props.entryKey}</div>;
    }),
  };
});

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

const handlers: MessageListHandlers = {
  react: vi.fn(),
  reply: vi.fn(),
  copy: vi.fn(),
  deliveryDetails: vi.fn(),
  retry: vi.fn(),
  retryReaction: vi.fn(),
};
const sender = (nodeNum: number) => ({
  nodeNum,
  name: `Node ${nodeNum}`,
  initials: "N",
});
const nameOf = (nodeNum: number) => `Node ${nodeNum}`;
const formatTime = (date: Date) => date.toISOString();
const dayLabel = () => "Today";

/** Layout happy-dom doesn't do: the scroller's sizes, set per test. */
const layout = { scrollHeight: 100, clientHeight: 400 };
const scrollTops = new WeakMap<Element, number>();
const descriptors = new Map<string, PropertyDescriptor | undefined>();
let resize: (() => void) | undefined;

beforeEach(() => {
  renders.keys = [];
  layout.scrollHeight = 100;
  layout.clientHeight = 400;
  resize = undefined;
  for (const prop of ["scrollHeight", "clientHeight", "scrollTop"]) {
    descriptors.set(
      prop,
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
    );
  }
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return layout.scrollHeight;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return layout.clientHeight;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollTop", {
    configurable: true,
    get(this: Element) {
      return scrollTops.get(this) ?? 0;
    },
    set(this: Element, value: number) {
      scrollTops.set(
        this,
        Math.max(0, Math.min(value, layout.scrollHeight - layout.clientHeight)),
      );
    },
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  for (const [prop, descriptor] of descriptors) {
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, prop, descriptor);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, prop);
    }
  }
  vi.unstubAllGlobals();
});

const setup = (
  threads: readonly ThreadMessage[],
  loadOlder: () => Promise<number> = () => Promise.resolve(0),
) => {
  const props = {
    label: "Messages",
    variant: "dm" as const,
    connected: true,
    sender,
    quoteName: nameOf,
    nameOf,
    formatTime,
    dayLabel,
    loadOlder,
    handlers,
    touch: false,
    locale: "en",
  };
  const view = render(
    <MessageList {...props} entries={buildTimeline(threads, [])} />,
  );
  return {
    scroller: () => screen.getByRole("region", { name: "Messages" }),
    update: (next: readonly ThreadMessage[]) =>
      view.rerender(
        <MessageList {...props} entries={buildTimeline(next, [])} />,
      ),
  };
};

const flush = () => act(() => Promise.resolve());

describe("MessageList loading older history", () => {
  it("waits for the first page before paging back, then pages once", async () => {
    const loadOlder = vi.fn(() => Promise.resolve(0));
    const list = setup([], loadOlder);
    await flush();
    expect(loadOlder).not.toHaveBeenCalled();

    // Hydration delivers a short history: it doesn't fill the view.
    list.update([thread(1), thread(2)]);
    await flush();
    expect(loadOlder).toHaveBeenCalledTimes(1);

    // Nothing older: the start of the history, so no more requests.
    list.update([thread(1), thread(2), thread(3)]);
    await flush();
    expect(loadOlder).toHaveBeenCalledTimes(1);
  });

  it("doesn't give up on history after a failed load", async () => {
    const loadOlder = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("storage busy"))
      .mockResolvedValue(2);
    const list = setup([thread(5), thread(6)], loadOlder);
    await flush();
    expect(loadOlder).toHaveBeenCalledTimes(1);

    // No retry loop on its own...
    await flush();
    expect(loadOlder).toHaveBeenCalledTimes(1);

    // ...but scrolling to the top asks again.
    layout.scrollHeight = 1000;
    fireEvent.scroll(list.scroller());
    await flush();
    expect(loadOlder).toHaveBeenCalledTimes(2);
  });
});

describe("MessageList anchoring", () => {
  it("stays at the bottom while messages arrive", () => {
    layout.scrollHeight = 1000;
    const list = setup([thread(1), thread(2)]);
    const el = list.scroller();
    expect(el.scrollTop).toBe(600);
    list.update([thread(1), thread(2), thread(3)]);
    expect(el.scrollTop).toBe(600);
    expect(screen.queryByRole("button", { name: /new message/ })).toBeNull();
  });

  it("offers a new-messages button when the reader has scrolled up", () => {
    layout.scrollHeight = 1000;
    const loadOlder = vi.fn(() => new Promise<number>(() => {}));
    const list = setup([thread(1), thread(2)], loadOlder);
    const el = list.scroller();
    el.scrollTop = 300;
    fireEvent.scroll(el);
    list.update([thread(1), thread(2), thread(3), thread(4)]);
    expect(el.scrollTop).toBe(300);
    const pill = screen.getByRole("button", { name: "2 new messages" });
    fireEvent.click(pill);
    expect(screen.queryByRole("button", { name: /new message/ })).toBeNull();
  });

  it("keeps the bottom in view when content grows without new messages", () => {
    layout.scrollHeight = 1000;
    const list = setup([thread(1), thread(2)]);
    const el = list.scroller();
    expect(el.scrollTop).toBe(600);
    // A reaction chip or the reply strip changes the layout.
    layout.scrollHeight = 1080;
    act(() => resize?.());
    expect(el.scrollTop).toBe(680);
  });
});

describe("MessageList rendering", () => {
  it("re-renders only the new bubble when a message arrives", () => {
    const one = thread(1);
    const two = thread(2);
    const list = setup([one, two]);
    expect(renders.keys).toEqual([`${PEER}:1`, `${PEER}:2`]);
    renders.keys = [];
    list.update([one, two, thread(3)]);
    expect(renders.keys).toEqual([`${PEER}:3`]);
  });

  it("puts each day's messages in a list", () => {
    setup([thread(1), thread(2)]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
