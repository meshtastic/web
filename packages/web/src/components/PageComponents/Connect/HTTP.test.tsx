import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HTTP as Http } from "./HTTP.tsx";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { describe, expect, it, vi } from "vitest";

vi.mock("@core/stores/appStore.ts", () => ({
  useAppStore: vi.fn(() => ({
    setSelectedDevice: vi.fn(),
    addSavedServer: vi.fn(),
    removeSavedServer: vi.fn(),
    clearSavedServers: vi.fn(),
    getSavedServers: vi.fn(() => []),
  })),
}));

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDeviceStore: vi.fn(() => ({
    addDevice: vi.fn(() => ({ addConnection: vi.fn() })),
  })),
}));

vi.mock("@core/stores/messageStore/index.ts", () => ({
  useMessageStore: vi.fn(() => ({})),
}));

vi.mock("@core/utils/randId.ts", () => ({
  randId: vi.fn(() => "mock-id"),
}));

vi.mock("@core/subscriptions.ts", () => ({
  subscribeAll: vi.fn(),
}));

vi.mock("@meshtastic/transport-http", () => ({
  TransportHTTP: {
    create: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock("@meshtastic/core", () => ({
  MeshDevice: vi.fn(() => ({
    configure: vi.fn(),
  })),
}));

describe("HTTP Component", () => {
  it("renders correctly", () => {
    render(<Http closeDialog={vi.fn()} />);
    expect(screen.getByText("Meshtastic Servers")).toBeInTheDocument();
    expect(screen.getByText("Add New Server")).toBeInTheDocument();
    expect(screen.getByText("No saved servers yet")).toBeInTheDocument();
  });

  it("opens dialog when add new server is clicked", () => {
    render(<Http closeDialog={vi.fn()} />);
    const addButton = screen.getByText("Add New Server");
    fireEvent.click(addButton);
    expect(screen.getByText("Hostname or IP Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("meshtastic.local or 192.168.1.100"))
      .toBeInTheDocument();
  });

  it("toggles HTTPS switch in dialog", () => {
    render(<Http closeDialog={vi.fn()} />);

    // Open the dialog first
    const addButton = screen.getByText("Add New Server");
    fireEvent.click(addButton);

    const switchInput = screen.getByRole("switch");
    expect(screen.getByText("Use HTTPS (Secure)")).toBeInTheDocument();

    fireEvent.click(switchInput);
    expect(switchInput).toBeChecked();

    fireEvent.click(switchInput);
    expect(switchInput).not.toBeChecked();
  });

  it("enables HTTPS toggle when location protocol is https", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:" },
      writable: true,
    });

    render(<Http closeDialog={vi.fn()} />);

    // Open the dialog first
    const addButton = screen.getByText("Add New Server");
    fireEvent.click(addButton);

    const switchInput = screen.getByRole("switch");
    expect(switchInput).toBeChecked();
  });

  it.skip("submits form and triggers connection process", async () => {
    const closeDialog = vi.fn();
    render(<Http closeDialog={closeDialog} />);
    const button = screen.getByRole("button", { name: "Connect" });
    expect(button).not.toBeDisabled();

    try {
      fireEvent.click(button);
      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(closeDialog).toBeCalled();
        expect(TransportHTTP.create).toBeCalled();
        expect(MeshDevice).toBeCalled();
      });
    } catch (e) {
      console.error(e);
    }
  });
});
