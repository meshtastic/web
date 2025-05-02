import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { RefreshKeysDialog } from "./RefreshKeysDialog";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";

vi.mock("./useRefreshKeysDialog.ts", () => ({
  useRefreshKeysDialog: vi.fn(),
}));

describe("RefreshKeysDialog Component", () => {
  let handleCloseDialogMock: Mock;
  let handleNodeRemoveMock: Mock;
  let onOpenChangeMock: Mock;

  beforeEach(() => {
    handleCloseDialogMock = vi.fn();
    handleNodeRemoveMock = vi.fn();
    onOpenChangeMock = vi.fn();

    (useRefreshKeysDialog as Mock).mockReturnValue({
      handleCloseDialog: handleCloseDialogMock,
      handleNodeRemove: handleNodeRemoveMock,
    });
  });

  it("renders the dialog with correct content", () => {
    render(<RefreshKeysDialog open={true} onOpenChange={onOpenChangeMock} />);
    expect(screen.getByText("Keys Mismatch")).toBeInTheDocument();
    expect(screen.getByText("Request New Keys")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("calls handleNodeRemove when 'Request New Keys' button is clicked", () => {
    render(<RefreshKeysDialog open={true} onOpenChange={onOpenChangeMock} />);
    fireEvent.click(screen.getByText("Request New Keys"));
    expect(handleNodeRemoveMock).toHaveBeenCalled();
  });

  it("calls handleCloseDialog when 'Dismiss' button is clicked", () => {
    render(<RefreshKeysDialog open={true} onOpenChange={onOpenChangeMock} />);
    fireEvent.click(screen.getByText("Dismiss"));
    expect(handleCloseDialogMock).toHaveBeenCalled();
  });

  it("calls onOpenChange when dialog close button is clicked", () => {
    render(<RefreshKeysDialog open={true} onOpenChange={onOpenChangeMock} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(handleCloseDialogMock).toHaveBeenCalled();
  });

  it("does not render when open is false", () => {
    render(<RefreshKeysDialog open={false} onOpenChange={onOpenChangeMock} />);
    expect(screen.queryByText("Keys Mismatch")).not.toBeInTheDocument();
  });
});
