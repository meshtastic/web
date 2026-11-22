import type { RegistryInput } from "@core/commandMenu/sources.ts";
import { useAppStore } from "@core/stores/appStore/index.ts";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "better-result";
import i18n from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./index.tsx";

const env = vi.hoisted(() => ({
  navigate: vi.fn(),
  setDialogOpen: vi.fn(),
  toast: vi.fn(),
  traceRoute: vi.fn(),
  connected: true,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => env.navigate,
}));

vi.mock("@core/stores", async () => {
  const app = await import("@core/stores/appStore/index.ts");
  return {
    useAppStore: app.useAppStore,
    useDevice: () => ({ setDialogOpen: env.setDialogOpen }),
    useDeviceStore: <T,>(
      select: (state: { activeConnectionId: null }) => T,
    ): T => select({ activeConnectionId: null }),
  };
});

vi.mock("@core/kmp/hooks", () => ({
  useActiveClient: () =>
    env.connected
      ? {
          traceRoute: env.traceRoute,
          disconnect: vi.fn(),
          enterDfuMode: vi.fn(),
          rehandshake: vi.fn(),
        }
      : undefined,
}));

vi.mock("@pages/Connections/useConnections.ts", () => ({
  useConnections: () => ({ disconnect: vi.fn() }),
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: env.toast }),
}));

vi.mock("./useRegistryInput.ts", () => ({
  useRegistryInput: (now: number): RegistryInput => ({
    t: i18n.getFixedT("en", "commandPalette"),
    locale: "en",
    now,
    channels: [{ index: 0, name: "", disabled: false }],
    nodes: [
      { num: 1, longName: "Base", isFavorite: false },
      {
        num: 2,
        longName: "IB North",
        shortName: "IB-N",
        hopsAway: 2,
        isFavorite: true,
      },
    ],
    unreadByKey: new Map(),
    myNodeNum: 1,
    deviceName: "Base",
    devices: [],
    deviceTabs: [],
    moduleTabs: [],
  }),
}));

const openWithShortcut = () =>
  act(() => {
    fireEvent.keyDown(globalThis.document.body, { key: "k", metaKey: true });
  });

const pressChord = (target: Element, second: string) => {
  fireEvent.keyDown(target, { key: "g" });
  fireEvent.keyDown(target, { key: second });
};

describe("CommandPalette", () => {
  beforeEach(() => {
    useAppStore.setState({ commandPaletteOpen: false, nodeNumDetails: 0 });
    env.connected = true;
    env.traceRoute.mockResolvedValue(Result.ok({}));
  });

  it("toggles with ⌘K and Ctrl+K, but not while composing text", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
    openWithShortcut();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(globalThis.document.body, { key: "k", ctrlKey: true });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      fireEvent.keyDown(globalThis.document.body, {
        key: "k",
        metaKey: true,
        isComposing: true,
      });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("navigates on G then M", () => {
    render(<CommandPalette />);
    pressChord(globalThis.document.body, "m");
    expect(env.navigate).toHaveBeenCalledWith({ to: "/map" });
  });

  it("ignores chords typed into fields or while a dialog is open", () => {
    render(
      <>
        <input aria-label="field" />
        <CommandPalette />
      </>,
    );
    pressChord(screen.getByRole("textbox", { name: "field" }), "m");
    expect(env.navigate).not.toHaveBeenCalled();
    openWithShortcut();
    pressChord(globalThis.document.body, "n");
    expect(env.navigate).not.toHaveBeenCalled();
  });

  it("starts empty on every open", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.type(screen.getByRole("combobox"), "lora");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    openWithShortcut();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("navigates to a destination and closes", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.type(screen.getByRole("combobox"), "> map");
    await user.keyboard("{Enter}");
    expect(env.navigate).toHaveBeenCalledWith({ to: "/map", search: {} });
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });

  it("opens a conversation by route params", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.click(screen.getByRole("option", { name: /Primary/ }));
    expect(env.navigate).toHaveBeenCalledWith({
      to: "/messages/$type/$chatId",
      params: { type: "broadcast", chatId: "0" },
    });
  });

  it("opens node details for a node row", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.click(screen.getByRole("option", { name: /IB North.*hop/ }));
    expect(useAppStore.getState().nodeNumDetails).toBe(2);
    expect(env.setDialogOpen).toHaveBeenCalledWith("nodeDetails", true);
  });

  it("opens an action's dialog", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.click(screen.getByRole("option", { name: /Reboot Device/ }));
    expect(env.setDialogOpen).toHaveBeenCalledWith("reboot", true);
    expect(useAppStore.getState().commandPaletteOpen).toBe(false);
  });

  it("runs a traceroute from the node picker", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.click(screen.getByRole("option", { name: /Traceroute to/ }));
    expect(screen.getByRole("combobox")).toHaveFocus();
    await user.click(screen.getByRole("option", { name: /IB North/ }));
    expect(env.traceRoute).toHaveBeenCalledWith(2);
    await vi.waitFor(() =>
      expect(env.toast).toHaveBeenLastCalledWith({
        title: "Traceroute sent.",
      }),
    );
  });

  it("reports a failed or impossible traceroute", async () => {
    const user = userEvent.setup();
    env.traceRoute.mockRejectedValue(new Error("timeout"));
    render(<CommandPalette />);
    openWithShortcut();
    await user.click(screen.getByRole("option", { name: /Traceroute to/ }));
    await user.click(screen.getByRole("option", { name: /IB North/ }));
    await vi.waitFor(() =>
      expect(env.toast).toHaveBeenLastCalledWith({
        title: "Traceroute failed",
        variant: "destructive",
      }),
    );

    env.connected = false;
    openWithShortcut();
    await user.click(screen.getByRole("option", { name: /Traceroute to/ }));
    await user.click(screen.getByRole("option", { name: /IB North/ }));
    expect(env.toast).toHaveBeenLastCalledWith({
      title: "Connect a device first",
      variant: "destructive",
    });
  });

  it("pins a group from a command and keeps the menu open", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);
    openWithShortcut();
    await user.type(screen.getByRole("combobox"), "pin settings");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("Settings");
  });

  it("returns focus to where it was after closing", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <CommandPalette />
      </>,
    );
    const before = screen.getByRole("button", { name: "before" });
    before.focus();
    openWithShortcut();
    expect(screen.getByRole("combobox")).toHaveFocus();
    await user.keyboard("{Escape}");
    // Radix restores focus on the next tick after the dialog unmounts.
    await vi.waitFor(() => expect(before).toHaveFocus());
  });
});
