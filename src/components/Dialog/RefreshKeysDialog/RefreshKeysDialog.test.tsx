import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, Mock } from "vitest";
import { RefreshKeysDialog } from "./RefreshKeysDialog.tsx";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";
import { useMessageStore } from "@core/stores/messageStore.ts"; // Import for mocking
import { useDevice } from "@core/stores/deviceStore.ts"; // Import for mocking
import { Protobuf } from "@meshtastic/core";


vi.mock("@core/stores/messageStore.ts", () => ({
  useMessageStore: vi.fn(),
}));

const mockNodeWithError: Partial<Protobuf.Mesh.NodeInfo> = {
  user: { longName: "Test Node Long", shortName: "TNL", id: 456 },
};
const mockNodes = new Map([[456, mockNodeWithError]]);
const mockNodeErrors = new Map([[123, { node: 456 }]]);

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDevice: vi.fn(),
}));

const mockHandleCloseDialog = vi.fn();
const mockHandleNodeRemove = vi.fn();
vi.mock("./useRefreshKeysDialog.ts", () => ({
  useRefreshKeysDialog: vi.fn(() => ({
    handleCloseDialog: mockHandleCloseDialog,
    handleNodeRemove: mockHandleNodeRemove,
  })),
}));

describe("RefreshKeysDialog Component", () => {
  let onOpenChangeMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    onOpenChangeMock = vi.fn();

    vi.mocked(useMessageStore).mockReturnValue({ activeChat: 123 });
    vi.mocked(useDevice).mockReturnValue({
      nodeErrors: mockNodeErrors,
      nodes: mockNodes,
    });
    vi.mocked(useRefreshKeysDialog).mockReturnValue({
      handleCloseDialog: mockHandleCloseDialog,
      handleNodeRemove: mockHandleNodeRemove,
    });
  });

  it("should render the dialog with dynamic content when open and data is available", () => {
    render(<RefreshKeysDialog open onOpenChange={onOpenChangeMock} />);

    expect(screen.getByText(`Keys Mismatch - ${mockNodeWithError?.user?.longName}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${mockNodeWithError?.user?.longName}.*${mockNodeWithError?.user?.shortName}`))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request new keys/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
  });

  it("should call handleNodeRemove when 'Request New Keys' button is clicked", () => {
    render(<RefreshKeysDialog open onOpenChange={onOpenChangeMock} />);
    fireEvent.click(screen.getByRole('button', { name: /request new keys/i }));
    expect(mockHandleNodeRemove).toHaveBeenCalledTimes(1);
  });

  it("should call handleCloseDialog when 'Dismiss' button is clicked", () => {
    render(<RefreshKeysDialog open onOpenChange={onOpenChangeMock} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(mockHandleCloseDialog).toHaveBeenCalledTimes(1);
  });

  it("should call handleCloseDialog when the explicit DialogClose button is clicked", () => {
    render(<RefreshKeysDialog open onOpenChange={onOpenChangeMock} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i })); // Use the aria-label
    expect(mockHandleCloseDialog).toHaveBeenCalledTimes(1);
  });


  it("should not render the dialog when open is false", () => {
    render(<RefreshKeysDialog open={false} onOpenChange={onOpenChangeMock} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render null if nodeErrorNum is not found for activeChat", () => {
    vi.mocked(useDevice).mockReturnValue({
      nodeErrors: new Map(),
      nodes: mockNodes,
    });
    const { container } = render(<RefreshKeysDialog open onOpenChange={onOpenChangeMock} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render null if nodeWithError is not found for nodeErrorNum.node", () => {
    vi.mocked(useDevice).mockReturnValue({
      nodeErrors: mockNodeErrors,
      nodes: new Map(),
    });
    const { container } = render(<RefreshKeysDialog open onOpenChange={onOpenChangeMock} />);
    expect(container.firstChild).toBeNull();
  });
});