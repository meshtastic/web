import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoriteNode } from "./useFavoriteNode.ts";

const mockNode = {
  nodeNum: 1234,
  longName: "Test Node",
  isFavorite: true,
};

const mockToast = vi.fn();
const mockSetFavoriteNode = vi.fn();
const mockGetNode = vi.fn();
const mockDevice = { id: 1 };

vi.mock("@core/stores", () => ({
  useDevice: () => mockDevice,
  useDeviceContext: () => ({ deviceId: 1234 }),
}));

vi.mock("@core/hooks/useToast.ts", () => ({
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

vi.mock("@core/services/adminMessageService", () => ({
  AdminMessageService: {
    setFavoriteNode: (
      _device: unknown,
      _deviceId: number,
      _nodeNum: number,
      _isFavorite: boolean,
    ) => mockSetFavoriteNode(_device, _deviceId, _nodeNum, _isFavorite),
  },
}));

describe("useFavoriteNode hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNode.mockResolvedValue(mockNode);
  });

  it("calls AdminMessageService.setFavoriteNode and shows correct toast", async () => {
    const { result } = renderHook(() => useFavoriteNode());

    await act(async () => {
      await result.current.updateFavorite({ nodeNum: 1234, isFavorite: true });
    });

    expect(mockSetFavoriteNode).toHaveBeenCalledWith(
      mockDevice,
      1234,
      1234,
      true,
    );
    expect(mockGetNode).toHaveBeenCalledWith(1234, 1234);
    expect(mockToast).toHaveBeenCalled();
  });

  it("handles removal case", async () => {
    const { result } = renderHook(() => useFavoriteNode());

    await act(async () => {
      await result.current.updateFavorite({ nodeNum: 1234, isFavorite: false });
    });

    expect(mockSetFavoriteNode).toHaveBeenCalledWith(
      mockDevice,
      1234,
      1234,
      false,
    );
    expect(mockGetNode).toHaveBeenCalledWith(1234, 1234);
    expect(mockToast).toHaveBeenCalled();
  });

  it("does not call AdminMessageService if node not found", async () => {
    mockGetNode.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useFavoriteNode());

    await act(async () => {
      await result.current.updateFavorite({ nodeNum: 9999, isFavorite: false });
    });

    expect(mockSetFavoriteNode).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
