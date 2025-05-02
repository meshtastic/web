import { renderHook, act } from "@testing-library/react";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { useDevice } from "@core/stores/deviceStore.ts";

vi.mock("@core/stores/appStore.ts", () => ({
  useAppStore: vi.fn(() => ({ activeChat: "chat-123" })),
}));

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDevice: vi.fn(() => ({
    removeNode: vi.fn(),
    setDialogOpen: vi.fn(),
    getNodeError: vi.fn(),
    clearNodeError: vi.fn(),
  })),
}));

describe("useRefreshKeysDialog Hook", () => {
  let removeNodeMock: Mock;
  let setDialogOpenMock: Mock;
  let getNodeErrorMock: Mock;
  let clearNodeErrorMock: Mock;

  beforeEach(() => {
    removeNodeMock = vi.fn();
    setDialogOpenMock = vi.fn();
    getNodeErrorMock = vi.fn();
    clearNodeErrorMock = vi.fn();

    (useDevice as Mock).mockReturnValue({
      removeNode: removeNodeMock,
      setDialogOpen: setDialogOpenMock,
      getNodeError: getNodeErrorMock,
      clearNodeError: clearNodeErrorMock,
    });
  });

  it("handleNodeRemove should remove the node and update dialog if there is an error", () => {
    getNodeErrorMock.mockReturnValue({ node: "node-abc" });

    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleNodeRemove();
    });

    expect(getNodeErrorMock).toHaveBeenCalledWith("chat-123");
    expect(clearNodeErrorMock).toHaveBeenCalledWith("chat-123");
    expect(removeNodeMock).toHaveBeenCalledWith("node-abc");
    expect(setDialogOpenMock).toHaveBeenCalledWith("refreshKeys", false);
  });

  it("handleNodeRemove should do nothing if there is no error", () => {
    getNodeErrorMock.mockReturnValue(undefined);

    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleNodeRemove();
    });

    expect(removeNodeMock).not.toHaveBeenCalled();
    expect(setDialogOpenMock).not.toHaveBeenCalled();
    expect(clearNodeErrorMock).not.toHaveBeenCalled();
  });

  it("handleCloseDialog should close the dialog", () => {
    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleCloseDialog();
    });

    expect(setDialogOpenMock).toHaveBeenCalledWith("refreshKeys", false);
  });
});
