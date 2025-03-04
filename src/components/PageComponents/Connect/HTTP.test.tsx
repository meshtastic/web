import { describe, it, vi, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HTTP } from "@components/PageComponents/Connect/HTTP.tsx";
import { TransportHTTP } from "@meshtastic/transport-http";
import { MeshDevice } from "@meshtastic/core";

vi.mock("@core/stores/appStore.ts", () => ({
  useAppStore: vi.fn(() => ({ setSelectedDevice: vi.fn() })),
}));

vi.mock("@core/stores/deviceStore.ts", () => ({
  useDeviceStore: vi.fn(() => ({ addDevice: vi.fn(() => ({ addConnection: vi.fn() })) })),
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
    expect(screen.getByPlaceholderText("000.000.000.000 / meshtastic.local")).toBeInTheDocument();
    expect(screen.getByText("Use HTTPS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });

  it("allows input field to be updated", () => {
    render(<HTTP closeDialog={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "meshtastic.local" } });
    expect(input).toHaveValue("meshtastic.local");
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
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:" },
      writable: true,
    });

    render(<HTTP closeDialog={vi.fn()} />);

    const switchInput = screen.getByRole("switch");
    expect(switchInput).toBeChecked();
  });

  it.skip("submits form and triggers connection process", () => {
    // This will need further work to test, as it involves a lot of other plumbing mocking
    const closeDialog = vi.fn();
    render(<HTTP closeDialog={closeDialog} />);

    const button = screen.getByRole("button", { name: "Connect" });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    waitFor(() => {
      expect(button).toBeDisabled();
      expect(closeDialog).toHaveBeenCalled();
      expect(TransportHTTP.create).toHaveBeenCalled();
      expect(MeshDevice).toHaveBeenCalled();
    });
  });
});

