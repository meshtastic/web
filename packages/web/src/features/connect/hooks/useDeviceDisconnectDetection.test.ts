import { Types } from "@meshtastic/core";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceDisconnectDetection } from "./useDeviceDisconnectDetection";

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

describe("useDeviceDisconnectDetection", () => {
  beforeEach(() => {
    statusSubscribers = [];
    vi.clearAllMocks();
  });

  it("subscribes to onDeviceStatus when device connection exists", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    expect(
      mockDevice.connection.events.onDeviceStatus.subscribe,
    ).toHaveBeenCalledTimes(1);
  });

  it("calls callback when DeviceDisconnected status is received", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceDisconnected);
      }
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      Types.DeviceStatusEnum.DeviceDisconnected,
    );
  });

  it("calls callback when DeviceError status is received", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceError);
      }
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(Types.DeviceStatusEnum.DeviceError);
  });

  it("calls callback when DeviceRestarting status is received", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceRestarting);
      }
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      Types.DeviceStatusEnum.DeviceRestarting,
    );
  });

  it("does not call callback for DeviceConnected status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConnected);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback for DeviceConfigured status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConfigured);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback for DeviceConfiguring status", () => {
    const callback = vi.fn();
    renderHook(() => useDeviceDisconnectDetection(callback));

    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceConfiguring);
      }
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("unsubscribes when unmounted", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useDeviceDisconnectDetection(callback),
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
      ({ cb }) => useDeviceDisconnectDetection(cb),
      { initialProps: { cb: callback1 } },
    );

    // Update the callback
    rerender({ cb: callback2 });

    // Fire event - should use the latest callback
    act(() => {
      for (const subscriber of statusSubscribers) {
        subscriber(Types.DeviceStatusEnum.DeviceDisconnected);
      }
    });

    // The latest callback should have been called
    expect(callCount).toBe(2);
    expect(callback2).toHaveBeenCalled();
  });
});

describe("useDeviceDisconnectDetection without device", () => {
  beforeEach(() => {
    statusSubscribers = [];
    vi.clearAllMocks();
  });

  it("does not subscribe when device is null", () => {
    // Override mock to return null device
    vi.doMock("@state/device/store", () => ({
      useDeviceStore: () => null,
    }));

    const callback = vi.fn();

    // This test verifies the hook handles null device gracefully
    // The actual subscription won't happen because device?.connection is undefined
    expect(() => {
      renderHook(() => useDeviceDisconnectDetection(callback));
    }).not.toThrow();
  });
});
