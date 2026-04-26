import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFavoriteNode } from "./useFavoriteNode.ts";

const mockToast = vi.fn();
const mockSdkFavorite = vi.fn();
const mockSdkUnfavorite = vi.fn();
const mockByNum = vi.fn();
const { mockUseActiveClient } = vi.hoisted(() => ({
  mockUseActiveClient: vi.fn(),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useActiveClient: mockUseActiveClient,
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe("useFavoriteNode hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockByNum.mockReturnValue({
      num: 1234,
      user: { longName: "Test Node" },
      isFavorite: true,
    });
    mockUseActiveClient.mockReturnValue({
      nodes: {
        byNum: mockByNum,
        favorite: mockSdkFavorite,
        unfavorite: mockSdkUnfavorite,
      },
    });
  });

  it("calls SDK favorite and shows correct toast", () => {
    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 1234, isFavorite: true });
    });

    expect(mockSdkFavorite).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Added Test Node to favorites.",
    });
  });

  it("handles removal case", () => {
    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 1234, isFavorite: false });
    });

    expect(mockSdkUnfavorite).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Removed Test Node from favorites.",
    });
  });

  it("falls back to 'node' if longName is missing", () => {
    mockByNum.mockReturnValueOnce({ num: 5678, user: {} });

    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 5678, isFavorite: true });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Added Node to favorites.",
    });
  });

  it("no-ops if node is not in the SDK store", () => {
    mockByNum.mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useFavoriteNode());

    act(() => {
      result.current.updateFavorite({ nodeNum: 9999, isFavorite: false });
    });

    expect(mockSdkFavorite).not.toHaveBeenCalled();
    expect(mockSdkUnfavorite).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
