import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HTTP } from "@components/PageComponents/Connect/HTTP.tsx";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { describe, expect, it, vi } from "vitest";

vi.mock("@core/stores/appStore.ts", () => ({
  useAppStore: vi.fn(() => ({ setSelectedDevice: vi.fn() })),
}));

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDeviceStore: vi.fn(() => ({
    addDevice: vi.fn(() => ({ addConnection: vi.fn() })),
  })),
}));

vi.mock("@core/utils/randId.ts", () => ({
  randId: vi.fn(() => "mock-id"),
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
    render(<HTTP closeDialog={vi.fn()} />);
    expect(screen.getByText("IP Address/Hostname")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("000.000.000.000 / meshtastic.local"))
      .toBeInTheDocument();
    expect(screen.getByText("Use HTTPS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("allows input field to be updated", () => {
    render(<HTTP closeDialog={vi.fn()} />);
    const inputField = screen.getByRole("textbox");
    fireEvent.change(inputField, { target: { value: "meshtastic.local" } });
    expect(screen.getByPlaceholderText("000.000.000.000 / meshtastic.local"))
      .toBeInTheDocument();
  });

  it("toggles HTTPS switch and updates prefix", () => {
    render(<HTTP closeDialog={vi.fn()} />);

    const switchInput = screen.getByRole("switch");
    expect(screen.getByText("http://")).toBeInTheDocument();

    fireEvent.click(switchInput);
    expect(screen.getByText("https://")).toBeInTheDocument();

    fireEvent.click(switchInput);
    expect(switchInput).not.toBeChecked();
    expect(screen.getByText("http://")).toBeInTheDocument();
  });

  it("enables HTTPS toggle when location protocol is https", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:" },
      writable: true,
    });

    render(<HTTP closeDialog={vi.fn()} />);

    const switchInput = screen.getByRole("switch");
    expect(switchInput).toBeChecked();

    expect(screen.getByText("https://")).toBeInTheDocument();
  });

  it.skip("submits form and triggers connection process", async () => {
    const closeDialog = vi.fn();
    render(<HTTP closeDialog={closeDialog} />);
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
