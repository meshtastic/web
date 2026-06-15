import type { Protobuf } from "@meshtastic/core";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIgnoreNode } from "./useIgnoreNode.ts";

const mockNode = {
  num: 1234,
  user: {
    longName: "Test Node",
  },
  isIgnored: true,
} as unknown | Protobuf.Mesh.NodeInfo;

const mockUpdateIgnore = vi.fn();
const mockGetNode = vi.fn(() => mockNode);
const mockToast = vi.fn();
const mockSendAdminMessage = vi.fn();

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  useNodeDB: () => ({
    updateIgnore: mockUpdateIgnore,
    getNode: mockGetNode,
  }),
  useDevice: () => ({
    sendAdminMessage: mockSendAdminMessage,
  }),
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("useIgnoreNode hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateIgnored and shows correct toast", () => {
    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 1234, isIgnored: true });
    });

    expect(mockUpdateIgnore).toHaveBeenCalledWith(1234, true);
    expect(mockGetNode).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Added Test Node to ignore list",
    });
  });

  it("handles removal case", () => {
    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({
        nodeNum: 1234,
        isIgnored: false,
      });
    });

    expect(mockUpdateIgnore).toHaveBeenCalledWith(1234, false);
    expect(mockGetNode).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Removed Test Node from ignore list",
    });
  });

  it("falls back to 'node' if longName is missing", () => {
    mockGetNode.mockReturnValueOnce({
      num: 5678,
      user: {},
    }); // no longName

    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 5678, isIgnored: true });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Added node to ignore list",
    });
  });

  it("falls back to 'node' if getNode returns undefined", () => {
    mockGetNode.mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 9999, isIgnored: false });
    });

    expect(mockUpdateIgnore).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
