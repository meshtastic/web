import { act, renderHook } from "@testing-library/react";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useMessageStore } from "@core/stores/messageStore/index.ts";

vi.mock("@core/stores/messageStore", () => ({
  useMessageStore: vi.fn(() => ({ activeChat: "chat-123" })),
}));
vi.mock("@core/stores/deviceStore", () => ({
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
    vi.clearAllMocks();

    removeNodeMock = vi.fn();
    setDialogOpenMock = vi.fn();
    getNodeErrorMock = vi.fn().mockReturnValue(undefined);
    clearNodeErrorMock = vi.fn();

    vi.mocked(useDevice).mockReturnValue({
      removeNode: removeNodeMock,
      setDialogOpen: setDialogOpenMock,
      getNodeError: getNodeErrorMock,
      clearNodeError: clearNodeErrorMock,
    });

    vi.mocked(useMessageStore).mockReturnValue({
      activeChat: "chat-123",
    });
  });

  it("handleNodeRemove should remove the node and update dialog if there is an error", () => {
    getNodeErrorMock.mockReturnValue({ node: "node-abc" });

    const { result } = renderHook(() => useRefreshKeysDialog());
    act(() => {
      result.current.handleNodeRemove();
    });

    expect(getNodeErrorMock).toHaveBeenCalledTimes(1);
    expect(getNodeErrorMock).toHaveBeenCalledWith("chat-123");
    expect(clearNodeErrorMock).toHaveBeenCalledTimes(1);
    expect(clearNodeErrorMock).toHaveBeenCalledWith("chat-123");
    expect(removeNodeMock).toHaveBeenCalledTimes(1);
    expect(removeNodeMock).toHaveBeenCalledWith("node-abc");
    expect(setDialogOpenMock).toHaveBeenCalledTimes(1);
    expect(setDialogOpenMock).toHaveBeenCalledWith("refreshKeys", false);
  });

  it("handleNodeRemove should do nothing if there is no error", () => {
    const { result } = renderHook(() => useRefreshKeysDialog());
    act(() => {
      result.current.handleNodeRemove();
    });

    expect(getNodeErrorMock).toHaveBeenCalledTimes(1);
    expect(getNodeErrorMock).toHaveBeenCalledWith("chat-123");
    expect(clearNodeErrorMock).not.toHaveBeenCalled();
    expect(removeNodeMock).not.toHaveBeenCalled();
    expect(setDialogOpenMock).not.toHaveBeenCalled();
  });

  it("handleCloseDialog should close the dialog", () => {
    const { result } = renderHook(() => useRefreshKeysDialog());

    act(() => {
      result.current.handleCloseDialog();
    });

    expect(setDialogOpenMock).toHaveBeenCalledTimes(1);
    expect(setDialogOpenMock).toHaveBeenCalledWith("refreshKeys", false);
  });
});
