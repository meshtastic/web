import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConnectingOverlay } from "./ConnectingOverlay.tsx";

let savedConnections: Array<Record<string, unknown>> = [];

vi.mock("@core/stores", () => ({
  useDeviceStore: (selector: (s: { savedConnections: unknown }) => unknown) =>
    selector({ savedConnections }),
}));
vi.mock("@app/pages/Connections/useConnections", () => ({
  useConnections: () => ({ disconnect: vi.fn() }),
}));
vi.mock("@core/hooks/useLockdown.ts", () => ({
  useLockdown: () => ({ isLocked: false }),
}));
vi.mock("@meshtastic/sdk-react", () => ({
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

  it("shows nothing when no connection is in progress", () => {
    savedConnections = [connection({ status: "configured" })];
    const { container } = render(<ConnectingOverlay />);
    expect(container).toBeEmptyDOMElement();
  });
});
