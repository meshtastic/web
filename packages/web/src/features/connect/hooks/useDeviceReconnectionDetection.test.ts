import { Types } from "@meshtastic/core";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceReconnectionDetection } from "./useDeviceReconnectionDetection";

// Store subscribers so we can trigger events
let statusSubscribers: Array<(status: Types.DeviceStatusEnum) => void> = [];

// Mock device with event subscription
const mockDevice = {
  connection: {
    events: {
      onDeviceStatus: {
        subscribe: vi.fn(
          (callback: (status: Types.DeviceStatusEnum) => void) => {
            statusSubscribers.push(callback);
            return () => {
              statusSubscribers = statusSubscribers.filter(
                (cb) => cb !== callback,
              );
            };
          },
        ),
      },
    },
  },
};

// Mock useDeviceStore
vi.mock("@state/device/store", () => ({
  useDeviceStore: (
    selector: (state: { device: typeof mockDevice | null }) => unknown,
  ) => selector({ device: mockDevice }),
}));

describe("useDeviceReconnectionDetection", () => {
  beforeEach(() => {
    statusSubscribers = [];
    vi.clearAllMocks();
  });

  it("subscribes to onDeviceStatus when device connection exists", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    expect(
      mockDevice.connection.events.onDeviceStatus.subscribe,
    ).toHaveBeenCalledTimes(1);
  });

  it("calls callback when DeviceConnected status is received", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConnected);
      }
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls callback when DeviceConfigured status is received", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConfigured);
      }
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call callback for DeviceDisconnected status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceDisconnected);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback for DeviceError status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceError);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback for DeviceRestarting status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceRestarting);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback for DeviceConfiguring status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConfiguring);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback for DeviceConnecting status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConnecting);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("unsubscribes when unmounted", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useDeviceReconnectionDetection(callback),
    );

    expect(statusSubscribers.length).toBe(1);

    unmount();

    expect(statusSubscribers.length).toBe(0);
  });

  it("always uses the latest callback via useEffectEvent", () => {
    let callCount = 0;
    const callback1 = vi.fn(() => {
      callCount = 1;
    });
    const callback2 = vi.fn(() => {
      callCount = 2;
    });

    const { rerender } = renderHook(
      ({ cb }) => useDeviceReconnectionDetection(cb),
      { initialProps: { cb: callback1 } },
    );

    // Update the callback
    rerender({ cb: callback2 });

    // Fire event - should use the latest callback
    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConnected);
      }
    });

    // The latest callback should have been called
    expect(callCount).toBe(2);
    expect(callback2).toHaveBeenCalled();
  });

  it("calls callback for both Connected and Configured in sequence", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceReconnectionDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConnected);
      }
    });

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConfigured);
      }
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
