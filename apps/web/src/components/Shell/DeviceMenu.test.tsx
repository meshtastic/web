import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceCard } from "./DeviceCard.tsx";
import type { DeviceSummary } from "./deviceSummary.ts";
import type { DeviceMenuController } from "./useDeviceMenu.ts";

const state = vi.hoisted(() => {
  const summary: DeviceSummary = {
    name: "EAO1",
    initials: "EAO1",
    connected: true,
    state: "connected",
  };
  return {
    summary,
    runAction: vi.fn(),
    selectDevice: vi.fn(),
    connectAnother: vi.fn(),
  };
});

const connectedSummary: DeviceSummary = {
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

vi.mock("./useDeviceSummary.ts", () => ({
  useDeviceSummary: (): DeviceSummary => state.summary,
}));

vi.mock("./useDeviceMenu.ts", () => ({
  useDeviceMenu: (): DeviceMenuController => ({
    summary: state.summary,
    devices: [
      { id: 1, name: "EAO1", initials: "EAO1", active: true },
      { id: 2, name: "Base", initials: "BS", active: false },
    ],
    runAction: state.runAction,
    selectDevice: state.selectDevice,
    connectAnother: state.connectAnother,
  }),
}));

const openMenu = async () => {
  const user = userEvent.setup();
  render(<DeviceCard />);
  const trigger = screen.getByRole("button", { name: "Device details" });
  trigger.focus();
  await user.keyboard("{Enter}");
  const panel = await screen.findByRole("dialog", { name: "EAO1" });
  return { user, trigger, panel };
};

beforeEach(() => {
  state.summary = connectedSummary;
});

describe("DeviceCard", () => {
  it("shows name, transport, voltage and firmware", () => {
    render(<DeviceCard />);
    expect(screen.getAllByText("EAO1")).toHaveLength(2);
    expect(screen.getByText("Serial · 4.35 V · fw 2.8.1")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Connected" })).toBeInTheDocument();
  });

  it("omits facts the radio has not reported", () => {
    state.summary = {
      name: "EAO1",
      initials: "EAO1",
      state: "offline",
      connected: false,
    };
    render(<DeviceCard />);
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("spells out a connection in progress", () => {
    state.summary = {
      name: "EAO1",
      initials: "EAO1",
      state: "configuring",
      connected: false,
      transport: "bluetooth",
    };
    render(<DeviceCard />);
    expect(
      screen.getByText("Syncing with device… · Bluetooth"),
    ).toBeInTheDocument();
  });
});

describe("DeviceMenu", () => {
  it("opens from the keyboard with the device's stats", async () => {
    const { trigger, panel } = await openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(panel).getByText("Plugged in")).toBeInTheDocument();
    expect(within(panel).getByText("4.35 V")).toBeInTheDocument();
    expect(within(panel).getByText("2.8.1")).toBeInTheDocument();
    expect(within(panel).getByText("8e6a88d")).toBeInTheDocument();
    expect(within(panel).getByText("18.3%")).toBeInTheDocument();
    expect(within(panel).getByText("2%")).toBeInTheDocument();
  });

  it.each([
    ["Device settings", "deviceSettings"],
    ["Manage Connections", "manageConnections"],
    ["Reboot device", "reboot"],
    ["Disconnect", "disconnect"],
  ])("%s runs its action and closes the menu", async (name, action) => {
    const { user, panel } = await openMenu();
    await user.click(within(panel).getByRole("button", { name }));
    expect(state.runAction).toHaveBeenCalledWith(action);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides reboot and disconnect while disconnected", async () => {
    state.summary = {
      name: "EAO1",
      initials: "EAO1",
      state: "offline",
      connected: false,
    };
    const { panel } = await openMenu();
    expect(within(panel).getByText("Not connected")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Reboot device" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Disconnect" }),
    ).not.toBeInTheDocument();
  });

  it("lists devices, switches, and connects another", async () => {
    const { user, panel } = await openMenu();
    const active = within(panel).getByRole("button", { name: /EAO1\s*Active/ });
    expect(active).toHaveAttribute("aria-current", "true");

    await user.click(
      within(panel).getByRole("button", { name: "Switch to Base" }),
    );
    expect(state.selectDevice).toHaveBeenCalledWith(2);
  });

  it("starts a new connection", async () => {
    const { user, panel } = await openMenu();
    await user.click(
      within(panel).getByRole("button", { name: "Connect another device" }),
    );
    expect(state.connectAnother).toHaveBeenCalledOnce();
  });

  it("closes from its close button and with Escape", async () => {
    const { user, panel, trigger } = await openMenu();
    await user.click(within(panel).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("dialog", { name: "EAO1" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
