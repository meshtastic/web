import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIgnoreNode } from "./useIgnoreNode.ts";

const mockNode = {
  nodeNum: 1234,
  longName: "Test Node",
  isIgnored: true,
};

const mockToast = vi.fn();
const mockSetIgnoredNode = vi.fn();
const mockGetNode = vi.fn();

vi.mock("@shared/hooks/useMyNode", () => ({
  useMyNode: () => ({ myNodeNum: 1234, myNode: null }),
}));

vi.mock("@shared/hooks/useToast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@data/index", () => ({
  nodeRepo: {
    getNode: (deviceId: number, nodeNum: number) =>
      mockGetNode(deviceId, nodeNum),
  },
}));

vi.mock("@core/services/adminCommands", () => ({
  adminCommands: {
    setIgnoredNode: (nodeNum: number, isIgnored: boolean) =>
      mockSetIgnoredNode(nodeNum, isIgnored),
  },
}));

describe("useIgnoreNode hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNode.mockResolvedValue(mockNode);
  });

  it("calls adminCommands.setIgnoredNode and shows toast", async () => {
    const { result } = renderHook(() => useIgnoreNode());

    await act(async () => {
      await result.current.updateIgnored({ nodeNum: 1234, isIgnored: true });
    });

    expect(mockSetIgnoredNode).toHaveBeenCalledWith(1234, true);
    expect(mockGetNode).toHaveBeenCalledWith(1234, 1234);
    expect(mockToast).toHaveBeenCalled();
  });

  it("handles removal case", async () => {
    const { result } = renderHook(() => useIgnoreNode());

    await act(async () => {
      await result.current.updateIgnored({ nodeNum: 1234, isIgnored: false });
    });

    expect(mockSetIgnoredNode).toHaveBeenCalledWith(1234, false);
    expect(mockGetNode).toHaveBeenCalledWith(1234, 1234);
    expect(mockToast).toHaveBeenCalled();
  });

  it("does not call adminCommands if node not found", async () => {
    mockGetNode.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useIgnoreNode());

    await act(async () => {
      await result.current.updateIgnored({ nodeNum: 9999, isIgnored: false });
    });

    expect(mockSetIgnoredNode).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
