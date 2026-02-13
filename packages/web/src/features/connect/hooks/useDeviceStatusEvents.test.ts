import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceStatusEvents } from "./useDeviceStatusEvents";

// Store the disconnect callback passed to useDeviceDisconnectDetection
let disconnectCallback: (() => void) | null = null;

// Mock useDeviceDisconnectDetection
vi.mock("./useDeviceDisconnectDetection", () => ({
  useDeviceDisconnectDetection: (callback: () => void) => {
    disconnectCallback = callback;
  },
}));

// Mock dialog state
let mockDialogs = {
  deviceReboot: false,
  deviceDisconnect: false,
};

const mockSetDialogOpen = vi.fn();

// Mock useUIStore
vi.mock("@state/ui/store", () => ({
  useUIStore: Object.assign(
    (
      selector: (state: { setDialogOpen: typeof mockSetDialogOpen }) => unknown,
    ) => selector({ setDialogOpen: mockSetDialogOpen }),
    {
      getState: () => ({
        dialogs: mockDialogs,
      }),
    },
  ),
}));

describe("useDeviceStatusEvents", () => {
  beforeEach(() => {
    disconnectCallback = null;
    mockDialogs = {
      deviceReboot: false,
      deviceDisconnect: false,
    };
    mockSetDialogOpen.mockClear();
  });

  it("registers a disconnect callback", () => {
    renderHook(() => useDeviceStatusEvents());

    expect(disconnectCallback).not.toBeNull();
  });

  it("opens deviceDisconnect dialog when disconnect event fires and no dialogs are open", () => {
    renderHook(() => useDeviceStatusEvents());

    // Simulate disconnect event
    disconnectCallback?.();

    expect(mockSetDialogOpen).toHaveBeenCalledTimes(1);
    expect(mockSetDialogOpen).toHaveBeenCalledWith("deviceDisconnect", true);
  });

  it("does not open deviceDisconnect dialog when deviceReboot dialog is open", () => {
    mockDialogs.deviceReboot = true;

    renderHook(() => useDeviceStatusEvents());

    // Simulate disconnect event
    disconnectCallback?.();

    expect(mockSetDialogOpen).not.toHaveBeenCalled();
  });

  it("does not open deviceDisconnect dialog when deviceDisconnect dialog is already open", () => {
    mockDialogs.deviceDisconnect = true;

    renderHook(() => useDeviceStatusEvents());

    // Simulate disconnect event
    disconnectCallback?.();

    expect(mockSetDialogOpen).not.toHaveBeenCalled();
  });

  it("does not open deviceDisconnect dialog when both dialogs are open", () => {
    mockDialogs.deviceReboot = true;
    mockDialogs.deviceDisconnect = true;

    renderHook(() => useDeviceStatusEvents());

    // Simulate disconnect event
    disconnectCallback?.();

    expect(mockSetDialogOpen).not.toHaveBeenCalled();
  });

  it("reads latest dialog state when disconnect event fires", () => {
    renderHook(() => useDeviceStatusEvents());

    // Initially no dialogs open
    expect(mockDialogs.deviceReboot).toBe(false);

    // Change state before firing event
    mockDialogs.deviceReboot = true;

    // Simulate disconnect event
    disconnectCallback?.();

    // Should not open dialog because deviceReboot is now true
    expect(mockSetDialogOpen).not.toHaveBeenCalled();
  });

  it("opens dialog after deviceReboot dialog is closed", () => {
    // Start with reboot dialog open
    mockDialogs.deviceReboot = true;

    renderHook(() => useDeviceStatusEvents());

    // First disconnect event - should not open
    disconnectCallback?.();
    expect(mockSetDialogOpen).not.toHaveBeenCalled();

    // Close reboot dialog
    mockDialogs.deviceReboot = false;

    // Second disconnect event - should open
    disconnectCallback?.();
    expect(mockSetDialogOpen).toHaveBeenCalledTimes(1);
    expect(mockSetDialogOpen).toHaveBeenCalledWith("deviceDisconnect", true);
  });
});
