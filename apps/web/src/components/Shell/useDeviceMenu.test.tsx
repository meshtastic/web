import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeviceSummary } from "./deviceSummary.ts";
import { useDeviceMenu } from "./useDeviceMenu.ts";

interface FakeDevice {
  id: number;
  myNodeNum: number | undefined;
  connectionId: number | null;
  hardware: { myNodeNum: number };
}

interface FakeDeviceStore {
  activeConnectionId: number | null;
  savedConnections: Array<{ id: number; name: string; nodeNum?: number }>;
  devices: Map<number, FakeDevice>;
}

interface FakeAppStore {
  openConnections: (view?: string) => void;
  selectedDeviceId: number;
  setSelectedDevice: (id: number) => void;
}

const env = vi.hoisted(() => {
  const summary: DeviceSummary = {
    name: "EAO1",
    initials: "EAO1",
    state: "connected",
    connected: true,
  };
  return {
    summary,
    navigate: vi.fn(),
    connectionsDisconnect: vi.fn(() => Promise.resolve()),
    clientDisconnect: vi.fn(() => Promise.resolve()),
    setDialogOpen: vi.fn(),
    openConnections: vi.fn(),
    setSelectedDevice: vi.fn(),
    activeConnectionId: 7,
  };
});

const deviceStore = (): FakeDeviceStore => ({
  activeConnectionId: env.activeConnectionId,
  savedConnections: [
    { id: 7, name: "USB radio", nodeNum: 0x1111 },
    { id: 8, name: "Garage radio", nodeNum: 0x2222 },
  ],
  devices: new Map([
    [
      1,
      {
        id: 1,
        myNodeNum: 0x1111,
        connectionId: 7,
        hardware: { myNodeNum: 0x1111 },
      },
    ],
    [
      2,
      {
        id: 2,
        myNodeNum: undefined,
        connectionId: null,
        hardware: { myNodeNum: 0x2222 },
      },
    ],
  ]),
});

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => env.navigate,
}));

vi.mock("@core/kmp/hooks", () => ({
  useActiveClient: () => ({ disconnect: env.clientDisconnect }),
}));

vi.mock("@pages/Connections/useConnections.ts", () => ({
  useConnections: () => ({ disconnect: env.connectionsDisconnect }),
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useNodesAsProto: () => [
    { num: 0x1111, user: { longName: "EAO1 base", shortName: "EAO1" } },
  ],
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({ setDialogOpen: env.setDialogOpen }),
  useDeviceStore: <T,>(select: (state: FakeDeviceStore) => T): T =>
    select(deviceStore()),
  useAppStore: <T,>(select: (state: FakeAppStore) => T): T =>
    select({
      openConnections: env.openConnections,
      selectedDeviceId: 1,
      setSelectedDevice: env.setSelectedDevice,
    }),
}));

vi.mock("./useDeviceSummary.ts", () => ({
  useDeviceSummary: (): DeviceSummary => env.summary,
}));

beforeEach(() => {
  env.activeConnectionId = 7;
});

describe("useDeviceMenu", () => {
  it("disconnects through the connection manager when a connection is active", () => {
    const { result } = renderHook(() => useDeviceMenu());
    act(() => result.current.runAction("disconnect"));
    expect(env.connectionsDisconnect).toHaveBeenCalledWith(7);
    expect(env.clientDisconnect).not.toHaveBeenCalled();
  });

  it("falls back to the client without an active connection", () => {
    env.activeConnectionId = 0;
    const { result } = renderHook(() => useDeviceMenu());
    act(() => result.current.runAction("disconnect"));
    expect(env.clientDisconnect).toHaveBeenCalledOnce();
    expect(env.connectionsDisconnect).not.toHaveBeenCalled();
  });

  it("opens device settings, connections and the reboot dialog", () => {
    const { result } = renderHook(() => useDeviceMenu());
    act(() => result.current.runAction("deviceSettings"));
    expect(env.navigate).toHaveBeenCalledWith({ to: "/settings/device" });
    act(() => result.current.runAction("manageConnections"));
    expect(env.openConnections).toHaveBeenCalledWith();
    act(() => result.current.runAction("reboot"));
    expect(env.setDialogOpen).toHaveBeenCalledWith("reboot", true);
  });

  it("switches devices and starts a new connection", () => {
    const { result } = renderHook(() => useDeviceMenu());
    act(() => result.current.selectDevice(2));
    expect(env.setSelectedDevice).toHaveBeenCalledWith(2);
    act(() => result.current.connectAnother());
    expect(env.openConnections).toHaveBeenCalledWith("add");
  });

  it("names devices by owner name, else by their own saved connection", () => {
    const { result } = renderHook(() => useDeviceMenu());
    expect(result.current.devices).toEqual([
      { id: 1, name: "EAO1 base", initials: "EAO1", active: true },
      { id: 2, name: "Garage radio", initials: "Gara", active: false },
    ]);
  });
});
