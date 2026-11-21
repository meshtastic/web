import { useDeviceStore } from "@core/stores";
import type {
  Connection,
  NewConnection,
} from "@core/stores/deviceStore/types.ts";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWizardConnection } from "./useWizardConnection.ts";

const addConnectionAndConnect =
  vi.fn<(input: NewConnection) => Promise<Connection>>();
const removeConnection = vi.fn(async () => {});
const disconnect = vi.fn(async () => {});
const pickBluetoothDevice = vi.fn<() => Promise<BluetoothDevice>>();

vi.mock("@app/pages/Connections/useConnections.ts", () => ({
  useConnections: () => ({
    addConnectionAndConnect,
    removeConnection,
    disconnect,
  }),
}));

vi.mock("@core/connections/browserDevices.ts", () => ({
  MESHTASTIC_BLE_SERVICE: "service",
  pickBluetoothDevice: () => pickBluetoothDevice(),
  pickSerialPort: vi.fn(),
}));

const existing: Connection = {
  id: 1,
  type: "http",
  name: "Old radio",
  url: "http://10.0.0.9",
  createdAt: 0,
  status: "error",
};

/** Saves the new connection as failed, like a connect that errored. */
const failingConnect = async (input: NewConnection): Promise<Connection> => {
  const conn: Connection = { id: 2, createdAt: 0, status: "error", ...input };
  useDeviceStore.setState((s) => ({
    savedConnections: [...s.savedConnections, conn],
  }));
  return { ...conn, status: "disconnected" };
};

beforeEach(() => {
  useDeviceStore.setState({
    savedConnections: [existing],
    activeConnectionId: existing.id,
  });
  addConnectionAndConnect.mockReset();
  addConnectionAndConnect.mockImplementation(failingConnect);
  removeConnection.mockClear();
  pickBluetoothDevice.mockReset();
});

describe("useWizardConnection", () => {
  it("reports a failed connect and discards only what it created", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useWizardConnection(dispatch));
    await act(() => result.current.attempt("http", "http://meshtastic.local"));

    expect(dispatch).toHaveBeenCalledWith({
      type: "connectFailed",
      detail: undefined,
    });
    await act(() => result.current.discard());
    expect(removeConnection).toHaveBeenCalledTimes(1);
    expect(removeConnection).toHaveBeenCalledWith(2);
  });

  it("cleans up a failed attempt when the wizard unmounts", async () => {
    const { result, unmount } = renderHook(() => useWizardConnection(vi.fn()));
    await act(() => result.current.attempt("http", "http://meshtastic.local"));
    unmount();
    expect(removeConnection).toHaveBeenCalledWith(2);
    expect(removeConnection).not.toHaveBeenCalledWith(1);
  });

  it("keeps an attempt that reached a radio", async () => {
    addConnectionAndConnect.mockImplementation(async (input) => {
      const conn: Connection = {
        id: 3,
        createdAt: 0,
        status: "configured",
        nodeNum: 42,
        ...input,
      };
      useDeviceStore.setState((s) => ({
        savedConnections: [...s.savedConnections, conn],
      }));
      return conn;
    });
    const { result, unmount } = renderHook(() => useWizardConnection(vi.fn()));
    await act(() => result.current.attempt("http", "http://meshtastic.local"));
    unmount();
    expect(removeConnection).not.toHaveBeenCalled();
  });

  it("tells a closed picker from a missing adapter", async () => {
    const dispatch = vi.fn();
    const { result } = renderHook(() => useWizardConnection(dispatch));
    pickBluetoothDevice.mockRejectedValueOnce(
      Object.assign(new Error("User cancelled the requestDevice() chooser."), {
        name: "NotFoundError",
      }),
    );
    await act(() => result.current.attempt("bluetooth"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "pickerCancelled" });

    pickBluetoothDevice.mockRejectedValueOnce(
      Object.assign(new Error("Bluetooth adapter not available."), {
        name: "NotFoundError",
      }),
    );
    await act(() => result.current.attempt("bluetooth"));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "connectFailed",
      detail: "Bluetooth adapter not available.",
    });
    expect(addConnectionAndConnect).not.toHaveBeenCalled();
  });
});
