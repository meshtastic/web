import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceDisconnectDialog } from "./DeviceDisconnectDialog.tsx";

// Mock connection data
let mockConnection:
  | {
      id: number;
      status: string;
    }
  | undefined = {
  id: 1,
  status: "disconnected",
};

// Mock ConnectionService
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
vi.mock("@features/connect/services", () => ({
  ConnectionService: {
    connect: (...args: unknown[]) => mockConnect(...args),
    disconnect: (...args: unknown[]) => mockDisconnect(...args),
  },
}));

// Store the reconnection callback so tests can trigger it
let reconnectionCallback: (() => void) | null = null;

// Mock connect hooks
vi.mock("@features/connect/hooks", () => ({
  useConnectionByNodeNum: () => ({
    connection: mockConnection,
  }),
  useDeviceReconnectionDetection: (callback: () => void) => {
    reconnectionCallback = callback;
  },
}));

// Mock useNavigate and useParams
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ nodeNum: "123456789" }),
}));

describe("DeviceDisconnectDialog", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    mockNavigate.mockClear();
    reconnectionCallback = null;
    mockConnection = {
      id: 1,
      status: "disconnected",
    };
  });

  it("renders the dialog when open is true", () => {
    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText("Device Disconnected")).toBeInTheDocument();
    expect(
      screen.getByText("The connection to your device has been lost."),
    ).toBeInTheDocument();
    // There are two Close buttons (X icon and text button), verify at least one exists
    const closeButtons = screen.getAllByRole("button", { name: /Close/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /Reconnect/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to Connections" }),
    ).toBeInTheDocument();
  });

  it("does not render the dialog when open is false", () => {
    render(
      <DeviceDisconnectDialog open={false} onOpenChange={mockOnOpenChange} />,
    );
    expect(screen.queryByText("Device Disconnected")).toBeNull();
  });

  it("calls onOpenChange with false when the Close button is clicked", () => {
    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    // Click the text Close button (not the X icon)
    const closeButtons = screen.getAllByRole("button", { name: /Close/i });
    // The second one should be our text button (the first is the X icon)
    const textCloseButton = closeButtons.find(
      (btn) => btn.textContent === "Close",
    );
    expect(textCloseButton).toBeDefined();
    fireEvent.click(textCloseButton!);

    expect(mockOnOpenChange).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls ConnectionService.connect when Reconnect button is clicked", async () => {
    // Use a promise we can control to test the reconnecting state
    let resolveConnect: (value: boolean) => void;
    const connectPromise = new Promise<boolean>((resolve) => {
      resolveConnect = resolve;
    });
    mockConnect.mockReturnValue(connectPromise);

    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    // Click reconnect - this should start the reconnection process
    fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));

    // Verify connect was called
    expect(mockConnect).toHaveBeenCalledWith(mockConnection, {
      allowPrompt: true,
    });

    // Resolve the promise to complete the test
    await act(async () => {
      resolveConnect!(false);
    });
  });

  it("shows error message when reconnect fails", async () => {
    mockConnect.mockResolvedValue(false);

    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to reconnect. Please check your device and try again.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("closes dialog when reconnection event fires during reconnecting phase", async () => {
    mockConnect.mockResolvedValue(true);

    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    // Start reconnecting
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));
    });

    // Verify we're in reconnecting state
    expect(screen.getByText("Reconnecting to device...")).toBeInTheDocument();

    // Simulate reconnection event firing
    act(() => {
      reconnectionCallback?.();
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("navigates to /connect when Go to Connections is clicked", () => {
    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Go to Connections" }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/connect" });
  });

  it("resets phase to disconnected when dialog reopens", async () => {
    mockConnect.mockResolvedValue(false);

    const { rerender } = render(
      <DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />,
    );

    // Click reconnect to change phase
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));
    });

    // Wait for reconnect to fail and return to disconnected phase
    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to reconnect. Please check your device and try again.",
        ),
      ).toBeInTheDocument();
    });

    // Close and reopen dialog
    rerender(
      <DeviceDisconnectDialog open={false} onOpenChange={mockOnOpenChange} />,
    );
    rerender(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    // Should be back to initial disconnected state
    expect(
      screen.getByText("The connection to your device has been lost."),
    ).toBeInTheDocument();
  });

  it("does not attempt reconnect if no connection exists", async () => {
    mockConnection = undefined;

    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));
    });

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("does not close dialog on reconnection event when in disconnected phase", () => {
    render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

    // We're in disconnected phase, not reconnecting
    // Firing reconnection event should not close the dialog
    act(() => {
      reconnectionCallback?.();
    });

    // onOpenChange should not have been called
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("does not close dialog on reconnection event when dialog is closed", async () => {
    mockConnect.mockResolvedValue(true);

    render(
      <DeviceDisconnectDialog open={false} onOpenChange={mockOnOpenChange} />,
    );

    // Firing reconnection event when dialog is closed should not call onOpenChange
    act(() => {
      reconnectionCallback?.();
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  describe("reconnecting phase UI", () => {
    it("shows disabled Reconnecting button with spinner during reconnecting phase", async () => {
      // Use a promise that never resolves to keep us in reconnecting state
      mockConnect.mockReturnValue(new Promise(() => {}));

      render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

      // Click reconnect to enter reconnecting phase
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));

      // Verify the reconnecting button is shown and disabled
      const reconnectingButton = screen.getByRole("button", {
        name: /Reconnecting/i,
      });
      expect(reconnectingButton).toBeInTheDocument();
      expect(reconnectingButton).toBeDisabled();
    });

    it("shows Cancel button during reconnecting phase", async () => {
      mockConnect.mockReturnValue(new Promise(() => {}));

      render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

      // Click reconnect to enter reconnecting phase
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));

      // Verify Cancel button is shown
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });

    it("does not show Go to Connections button during reconnecting phase", async () => {
      mockConnect.mockReturnValue(new Promise(() => {}));

      render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

      // Click reconnect to enter reconnecting phase
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));

      // Verify Go to Connections is not shown
      expect(
        screen.queryByRole("button", { name: "Go to Connections" }),
      ).toBeNull();
    });

    it("Close button is visible and clickable during reconnecting phase", async () => {
      mockConnect.mockReturnValue(new Promise(() => {}));

      render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

      // Click reconnect to enter reconnecting phase
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));

      // Find and click the Close button
      const closeButtons = screen.getAllByRole("button", { name: /Close/i });
      const textCloseButton = closeButtons.find(
        (btn) => btn.textContent === "Close",
      );
      expect(textCloseButton).toBeDefined();
      fireEvent.click(textCloseButton!);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("Cancel button resets phase to disconnected and calls disconnect", async () => {
      mockConnect.mockReturnValue(new Promise(() => {}));
      mockDisconnect.mockResolvedValue(undefined);

      render(<DeviceDisconnectDialog open onOpenChange={mockOnOpenChange} />);

      // Click reconnect to enter reconnecting phase
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));

      // Verify we're in reconnecting state
      expect(screen.getByText("Reconnecting to device...")).toBeInTheDocument();

      // Click Cancel
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      });

      // Verify disconnect was called
      expect(mockDisconnect).toHaveBeenCalledWith(mockConnection);

      // Verify we're back to disconnected phase (shows "Go to Connections" button)
      expect(
        screen.getByRole("button", { name: "Go to Connections" }),
      ).toBeInTheDocument();
    });
  });
});
