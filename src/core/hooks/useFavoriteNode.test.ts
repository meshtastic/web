import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoriteNode } from "./useFavoriteNode.ts";
import { Protobuf } from "@meshtastic/core";

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

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDevice: () => ({
    updateFavorite: mockUpdateFavorite,
    getNode: mockGetNode,
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
      title: "Added Test Node to favorites",
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
      title: "Removed Test Node from favorites",
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
      title: "Added node to favorites",
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
