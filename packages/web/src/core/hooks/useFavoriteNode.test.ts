import type { Protobuf } from "@meshtastic/core";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoriteNode } from "./useFavoriteNode.ts";

const mockNode = {
  num: 1234,
  user: {
    longName: "Test Node",
  },
  isFavorite: true,
} as unknown | Protobuf.Mesh.NodeInfo;

const mockUpdateFavorite = vi.fn();
const mockGetNode = vi.fn(() => mockNode);
const mockToast = vi.fn();
const mockSendAdminMessage = vi.fn();

vi.mock("@core/stores", () => ({
  CurrentDeviceContext: {
    _currentValue: { deviceId: 1234 },
  },
  useNodeDB: () => ({
    updateFavorite: mockUpdateFavorite,
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

describe("useFavoriteNode hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateFavorite and shows correct toast", () => {
    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 1234, isFavorite: true });
    });

    expect(mockUpdateFavorite).toHaveBeenCalledWith(1234, true);
    expect(mockGetNode).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Added Test Node to favorites.",
    });
  });

  it("handles removal case", () => {
    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 1234, isFavorite: false });
    });

    expect(mockUpdateFavorite).toHaveBeenCalledWith(1234, false);
    expect(mockGetNode).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Removed Test Node from favorites.",
    });
  });

  it("falls back to 'node' if longName is missing", () => {
    mockGetNode.mockReturnValueOnce({
      num: 5678,
      user: {},
    }); // no longName

    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 5678, isFavorite: true });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Added Node to favorites.",
    });
  });

  it("falls back to 'node' if getNode returns undefined", () => {
    mockGetNode.mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 9999, isFavorite: false });
    });

    expect(mockUpdateFavorite).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
