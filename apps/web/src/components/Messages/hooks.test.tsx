import type { SidebarConversation } from "@core/messaging/conversations.ts";
import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useConversationRowViews } from "./useConversationRowViews.ts";
import { LONG_PRESS_MS, useLongPress } from "./useLongPress.ts";
import { useMarkReadWhileVisible } from "./useMarkReadWhileVisible.ts";

describe("useMarkReadWhileVisible", () => {
  const setVisibility = (state: "visible" | "hidden") => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };
  afterEach(() => setVisibility("visible"));

  it("is the active conversation only while the tab is visible", () => {
    const unread = { setActive: vi.fn() };
    const { unmount } = renderHook(() =>
      useMarkReadWhileVisible(unread, { kind: "channel", channel: 2 }),
    );
    expect(unread.setActive).toHaveBeenLastCalledWith({
      kind: "channel",
      channel: 2,
    });
    act(() => setVisibility("hidden"));
    expect(unread.setActive).toHaveBeenLastCalledWith(undefined);
    act(() => setVisibility("visible"));
    expect(unread.setActive).toHaveBeenLastCalledWith({
      kind: "channel",
      channel: 2,
    });
    unmount();
    expect(unread.setActive).toHaveBeenLastCalledWith(undefined);
  });
});

describe("useLongPress", () => {
  const Pressable = ({
    onLongPress,
    onClick,
  }: {
    onLongPress: () => void;
    onClick: () => void;
  }) => {
    const { handlers, pressing } = useLongPress(onLongPress);
    return (
      <button
        type="button"
        data-pressing={pressing}
        onClick={onClick}
        {...handlers}
      >
        hold
      </button>
    );
  };

  it("fires on a held touch, blocks the context menu and the lift click", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { getByRole } = render(
      <Pressable onLongPress={onLongPress} onClick={onClick} />,
    );
    const target = getByRole("button");
    fireEvent.pointerDown(target, { pointerType: "touch", clientX: 5 });
    expect(target).toHaveAttribute("data-pressing", "true");
    const menu = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onLongPress).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(target);
    fireEvent.click(target);
    expect(onClick).not.toHaveBeenCalled();
    // The next, ordinary click goes through.
    fireEvent.click(target);
    expect(onClick).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("ignores mouse presses and touches that move", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { getByRole } = render(
      <Pressable onLongPress={onLongPress} onClick={vi.fn()} />,
    );
    const target = getByRole("button");
    fireEvent.pointerDown(target, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerDown(target, {
      pointerType: "touch",
      clientX: 0,
      clientY: 0,
    });
    fireEvent.pointerMove(target, { clientX: 40, clientY: 0 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("useConversationRowViews", () => {
  const row = (unread: number): SidebarConversation => ({
    id: "channel:0",
    key: { kind: "channel", channel: 0 },
    target: { kind: "channel", channel: 0 },
    unread,
    favorite: false,
    lastMessage: {
      from: 7,
      excerpt: "Morning all",
      rxTime: new Date(2026, 10, 21, 9, 0),
    },
  });
  const input = (now: number) => ({
    channels: [],
    nameOf: (n: number) => `Node ${n}`,
    peer: () => undefined,
    myNodeNum: 1,
    now,
  });

  it("names the primary channel and prefixes the sender", () => {
    const { result } = renderHook(() =>
      useConversationRowViews(input(Date.now())),
    );
    const view = result.current.toView(row(2));
    expect(view).toMatchObject({
      kind: "channel",
      title: "Primary",
      unread: 2,
      muted: false,
      preview: "Node 7: Morning all",
      route: { type: "broadcast", chatId: 0 },
    });
  });

  it("reuses a row's view within the same minute", () => {
    const now = new Date(2026, 10, 21, 10, 0, 5).getTime();
    const { result, rerender } = renderHook(
      ({ at }) => useConversationRowViews(input(at)),
      { initialProps: { at: now } },
    );
    const summary = row(1);
    const first = result.current.toView(summary);
    rerender({ at: now + 20_000 });
    expect(result.current.toView(summary)).toBe(first);
    rerender({ at: now + 70_000 });
    expect(result.current.toView(summary)).not.toBe(first);
  });

  it("previews mentions by their current names and flags mentions of me", () => {
    const summary: SidebarConversation = {
      ...row(1),
      mentioned: true,
      lastMessage: {
        from: 7,
        excerpt: "ping @!00000001 and @!12345678",
        rxTime: new Date(2026, 10, 21, 9, 0),
      },
    };
    const { result, rerender } = renderHook(
      ({ name }) =>
        useConversationRowViews({
          ...input(Date.now()),
          mentionName: (n: number) => (n === 1 ? name : undefined),
        }),
      { initialProps: { name: "Base" } },
    );
    expect(result.current.toView(summary)).toMatchObject({
      preview: "Node 7: ping @Base and @!12345678",
      mentioned: true,
    });
    rerender({ name: "Base Camp" });
    expect(result.current.toView(summary).preview).toBe(
      "Node 7: ping @Base Camp and @!12345678",
    );
  });
});
