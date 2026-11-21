import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConnectingOverlay } from "./ConnectingOverlay.tsx";

let savedConnections: Array<Record<string, unknown>> = [];

vi.mock("@core/stores", () => ({
  useDeviceStore: (selector: (s: { savedConnections: unknown }) => unknown) =>
    selector({ savedConnections }),
}));
const disconnect = vi.hoisted(() => vi.fn());
vi.mock("@app/pages/Connections/useConnections", () => ({
  useConnections: () => ({ disconnect }),
}));
vi.mock("@core/hooks/useLockdown.ts", () => ({
  useLockdown: () => ({ isLocked: false }),
}));
vi.mock("@core/kmp/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/kmp/hooks")>()),
  useConnectionProgress: () => ({ phase: "connecting" }),
}));

const connection = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Serial: 303a:1001",
  type: "serial",
  status: "connecting",
  ...overrides,
});

describe("ConnectingOverlay", () => {
  it("says Connecting for a connection that has never connected", () => {
    savedConnections = [connection()];
    render(<ConnectingOverlay />);
    expect(
      screen.getByRole("heading", { name: "Connecting" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Serial: 303a:1001")).toBeInTheDocument();
  });

  it("says Reconnecting for a connection that has connected before", () => {
    savedConnections = [connection({ lastConnectedAt: 1_700_000_000_000 })];
    render(<ConnectingOverlay />);
    expect(
      screen.getByRole("heading", { name: "Reconnecting" }),
    ).toBeInTheDocument();
  });

  it("shows the SDK's reconnect attempt", () => {
    savedConnections = [
      connection({ reconnect: { attempt: 3, maxAttempts: 10 } }),
    ];
    render(<ConnectingOverlay />);
    expect(screen.getByRole("heading", { name: "Reconnecting" })).toBeDefined();
    expect(screen.getByText("Reconnect attempt 3 of 10…")).toBeDefined();
  });

  it("shows nothing when no connection is in progress", () => {
    savedConnections = [connection({ status: "configured" })];
    const { container } = render(<ConnectingOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it("moves focus to Cancel when a connect takes too long, and cancels it", () => {
    vi.useFakeTimers();
    try {
      savedConnections = [connection()];
      render(<ConnectingOverlay />);
      expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

      act(() => {
        vi.advanceTimersByTime(15_000);
      });
      const cancel = screen.getByRole("button", { name: "Cancel" });
      expect(cancel).toHaveFocus();
      fireEvent.click(cancel);
      expect(disconnect).toHaveBeenCalledWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
