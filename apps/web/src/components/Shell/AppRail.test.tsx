import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppRail } from "./AppRail.tsx";
import { BottomTabBar } from "./BottomTabBar.tsx";
import type { DeviceSummary } from "./deviceSummary.ts";
import type { DeviceMenuController } from "./useDeviceMenu.ts";

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
}));

const summary: DeviceSummary = {
  name: "EAO1",
  initials: "EAO1",
  connected: true,
  state: "connected",
  transport: "serial",
  target: "303a:1001",
  power: { kind: "pluggedIn" },
  voltage: "4.35",
  firmware: { version: "2.8.1", build: "8e6a88d" },
  channelUtilization: "18.3",
  airUtilTx: "2",
};

const controller = vi.hoisted(() => ({
  runAction: vi.fn(),
  selectDevice: vi.fn(),
  connectAnother: vi.fn(),
}));

vi.mock("./useDeviceMenu.ts", () => ({
  useDeviceMenu: (): DeviceMenuController => ({
    summary,
    devices: [{ id: 1, name: "EAO1", initials: "EAO1", active: true }],
    runAction: controller.runAction,
    selectDevice: controller.selectDevice,
    connectAnother: controller.connectAnother,
  }),
}));

const renderRail = (pathname: string, unreadCount = 0) => {
  const onOpenCommandMenu = vi.fn();
  render(
    <AppRail
      pathname={pathname}
      unreadCount={unreadCount}
      nodeCount={243}
      device={summary}
      onOpenCommandMenu={onOpenCommandMenu}
    />,
  );
  return { onOpenCommandMenu };
};

describe("AppRail", () => {
  it("is a labelled navigation landmark with every destination", () => {
    renderRail("/nodes");
    const nav = screen.getByRole("navigation", { name: "App" });
    expect(within(nav).getByRole("link", { name: "Messages" })).toHaveAttribute(
      "href",
      "/messages",
    );
    expect(
      within(nav).getByRole("link", { name: "Nodes (243)" }),
    ).toHaveAttribute("href", "/nodes");
    expect(within(nav).getByRole("link", { name: "Map" })).toHaveAttribute(
      "href",
      "/map",
    );
    expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(
      within(nav).getByRole("button", { name: "Command menu" }),
    ).toBeInTheDocument();
  });

  it("marks only the active destination as the current page", () => {
    renderRail("/settings/lora");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const name of ["Messages", "Nodes (243)", "Map"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });

  it("puts the unread count in the Messages name", () => {
    renderRail("/messages/broadcast/0", 3);
    const messages = screen.getByRole("link", { name: "Messages, 3 unread" });
    expect(messages).toHaveAttribute("aria-current", "page");
    expect(messages).toHaveTextContent("3");
  });

  it("opens the command menu", async () => {
    const { onOpenCommandMenu } = renderRail("/map");
    await userEvent.click(screen.getByRole("button", { name: "Command menu" }));
    expect(onOpenCommandMenu).toHaveBeenCalledOnce();
  });

  it("opens the device menu from the keyboard", async () => {
    const user = userEvent.setup();
    renderRail("/map");
    const device = screen.getByRole("button", {
      name: "Device EAO1, Connected",
    });
    expect(device).toHaveAttribute("aria-expanded", "false");

    device.focus();
    await user.keyboard("{Enter}");

    const panel = await screen.findByRole("dialog", { name: "EAO1" });
    expect(device).toHaveAttribute("aria-expanded", "true");
    expect(
      within(panel).getByText("Connected via Serial · 303a:1001"),
    ).toBeInTheDocument();
  });
});

describe("BottomTabBar", () => {
  it("shows the four tabs with the current one marked", () => {
    render(<BottomTabBar pathname="/messages/direct/42" unreadCount={2} />);
    const nav = screen.getByRole("navigation", { name: "App" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/messages",
      "/nodes",
      "/map",
      "/settings",
    ]);
    const chats = within(nav).getByRole("link", {
      name: "Chats 2 unread messages",
    });
    expect(chats).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Map" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
