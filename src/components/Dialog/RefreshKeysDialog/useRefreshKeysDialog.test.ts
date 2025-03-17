import { renderHook, act } from "@testing-library/react";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { useDevice } from "@core/stores/deviceStore.ts";

vi.mock("@core/stores/appStore.ts", () => {
  return {
    useAppStore: vi.fn(() => ({ activeChat: "chat-123" })),
  };
});

vi.mock("@core/stores/deviceStore.ts", () => {
  return {
    useDevice: vi.fn(() => ({
      removeNode: vi.fn(),
      setDialogOpen: vi.fn(),
      nodeErrors: new Map(),
    })),
  };
});

describe("useRefreshKeysDialog Hook", () => {
  let removeNodeMock: Mock;
  let setDialogOpenMock: Mock;
  let nodeErrorsMock: Map<string, { node: string }>;

  beforeEach(() => {
    removeNodeMock = vi.fn();
    setDialogOpenMock = vi.fn();
    nodeErrorsMock = new Map();

    (useDevice as Mock).mockReturnValue({
      removeNode: removeNodeMock,
      setDialogOpen: setDialogOpenMock,
      nodeErrors: nodeErrorsMock,
    });
  });

  it("handleNodeRemove should remove the node and update dialog if there is an error", () => {
    nodeErrorsMock.set("chat-123", { node: "node-abc" });

    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleNodeRemove();
    });

    expect(removeNodeMock).toHaveBeenCalledWith("node-abc");
    expect(nodeErrorsMock.has("chat-123")).toBe(false);
    expect(setDialogOpenMock).toHaveBeenCalledWith("refreshKeys", false);
  });

  it("handleNodeRemove should do nothing if there is no error", () => {
    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleNodeRemove();
    });

    expect(removeNodeMock).not.toHaveBeenCalled();
    expect(setDialogOpenMock).not.toHaveBeenCalled();
  });

  it("handleCloseDialog should close the dialog on confirm", () => {
    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleCloseDialog();
    });

    expect(setDialogOpenMock).toHaveBeenCalledWith("refreshKeys", false);
  });

  it("handleCloseDialog should close the dialog on dismiss and not trigger any other actions", () => {
    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleCloseDialog();
    });

    expect(setDialogOpenMock).toHaveBeenCalled();
    expect(removeNodeMock).not.toHaveBeenCalled();
  });
});
