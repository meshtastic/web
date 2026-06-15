import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIgnoreNode } from "./useIgnoreNode.ts";

const mockToast = vi.fn();
const mockSdkIgnore = vi.fn();
const mockSdkUnignore = vi.fn();
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

describe("useIgnoreNode hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockByNum.mockReturnValue({
      num: 1234,
      user: { longName: "Test Node" },
      isIgnored: true,
    });
    mockUseActiveClient.mockReturnValue({
      nodes: {
        byNum: mockByNum,
        ignore: mockSdkIgnore,
        unignore: mockSdkUnignore,
      },
    });
  });

  it("calls SDK ignore and shows correct toast", () => {
    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 1234, isIgnored: true });
    });

    expect(mockSdkIgnore).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Added Test Node to ignore list",
    });
  });

  it("handles removal case", () => {
    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 1234, isIgnored: false });
    });

    expect(mockSdkUnignore).toHaveBeenCalledWith(1234);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Removed Test Node from ignore list",
    });
  });

  it("falls back to 'node' if longName is missing", () => {
    mockByNum.mockReturnValueOnce({ num: 5678, user: {} });

    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 5678, isIgnored: true });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Added node to ignore list",
    });
  });

  it("no-ops if node is not in the SDK store", () => {
    mockByNum.mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useIgnoreNode());

    act(() => {
      result.current.updateIgnored({ nodeNum: 9999, isIgnored: false });
    });

    expect(mockSdkIgnore).not.toHaveBeenCalled();
    expect(mockSdkUnignore).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });
});
