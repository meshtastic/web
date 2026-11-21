import { render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell.tsx";
import type { DeviceSummary } from "./deviceSummary.ts";
import { MobileHeaderControls } from "./MobileHeaderControls.tsx";
import type { TabBarStaticData } from "./navItems.ts";
import type { DeviceMenuController } from "./useDeviceMenu.ts";

const env = vi.hoisted(() => {
  const summary: DeviceSummary = {
    name: "EAO1",
    initials: "EAO1",
    connected: true,
    state: "connected",
  };
  const matches: Array<{ staticData?: TabBarStaticData }> = [];
  return { mobile: false, summary, matches, setCommandPaletteOpen: vi.fn() };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: ComponentPropsWithoutRef<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/messages/broadcast/0" }),
  useMatches: <T,>({
    select,
  }: {
    select: (matches: Array<{ staticData?: TabBarStaticData }>) => T;
  }) => select(env.matches),
}));

vi.mock("@core/hooks/useIsMobile.ts", () => ({
  useIsMobile: () => env.mobile,
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useNodesAsProto: () => [{ num: 1 }, { num: 2 }, { num: 3 }],
}));

vi.mock("@core/kmp/hooks", () => ({
  useTotalUnread: () => 4,
}));

vi.mock("@core/stores", () => ({
  useAppStore: (
    select: (state: { setCommandPaletteOpen: () => void }) => unknown,
  ) => select({ setCommandPaletteOpen: env.setCommandPaletteOpen }),
}));

vi.mock("./useDeviceSummary.ts", () => ({
  useDeviceSummary: (): DeviceSummary => env.summary,
}));

vi.mock("./useDeviceMenu.ts", () => ({
  useDeviceMenu: (): DeviceMenuController => ({
    summary: env.summary,
    devices: [],
    runAction: vi.fn(),
    selectDevice: vi.fn(),
    connectAnother: vi.fn(),
  }),
}));

const renderShell = () =>
  render(
    <AppShell>
      <div>page</div>
    </AppShell>,
  );

beforeEach(() => {
  env.mobile = false;
  env.matches = [];
});

describe("AppShell", () => {
  it("shows the rail and no tab bar on desktop", () => {
    renderShell();
    expect(screen.getByText("page")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Command menu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Messages, 4 unread" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nodes (2)" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /^Chats/ }),
    ).not.toBeInTheDocument();
  });

  it("swaps the rail for the bottom tab bar on mobile", () => {
    env.mobile = true;
    renderShell();
    expect(
      screen.getByRole("link", { name: "Chats 4 unread messages" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Command menu" }),
    ).not.toBeInTheDocument();
  });

  it("hides the tab bar when a matched route asks to", () => {
    env.mobile = true;
    env.matches = [{ staticData: {} }, { staticData: { hideTabBar: true } }];
    renderShell();
    expect(screen.getByText("page")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("MobileHeaderControls", () => {
  it("offers the command menu and the device menu", () => {
    render(<MobileHeaderControls />);
    screen.getByRole("button", { name: "Command menu" }).click();
    expect(env.setCommandPaletteOpen).toHaveBeenCalledWith(true);
    expect(
      screen.getByRole("button", { name: "Device EAO1, Connected" }),
    ).toHaveAttribute("aria-haspopup", "dialog");
  });
});
