import { MeshRegistryProvider } from "@core/kmp/hooks";
import { MeshRegistry } from "@core/kmp/registry.ts";
import { WELCOME_DISMISSED_KEY } from "@core/onboarding/welcome.ts";
import { useDeviceStore } from "@core/stores";
import type {
  Connection,
  NewConnection,
} from "@core/stores/deviceStore/types.ts";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingWizard } from "./OnboardingWizard.tsx";

const addConnectionAndConnect =
  vi.fn<(input: NewConnection) => Promise<Connection>>();
const removeConnection = vi.fn(async () => {});
const disconnect = vi.fn(async () => {});

vi.mock("@app/pages/Connections/useConnections.ts", () => ({
  useConnections: () => ({
    addConnectionAndConnect,
    removeConnection,
    disconnect,
  }),
}));

const failingHttpConnect = async (
  input: NewConnection,
): Promise<Connection> => {
  const conn: Connection = {
    id: 7,
    createdAt: 0,
    status: "error",
    error: "Radio not reachable",
    ...input,
  };
  useDeviceStore.setState({
    savedConnections: [conn],
    activeConnectionId: conn.id,
  });
  return { ...conn, status: "disconnected" };
};

const pendingHttpConnect = async (
  input: NewConnection,
): Promise<Connection> => {
  const conn: Connection = {
    id: 7,
    createdAt: 0,
    status: "connecting",
    ...input,
  };
  useDeviceStore.setState({
    savedConnections: [conn],
    activeConnectionId: conn.id,
  });
  return { ...conn, status: "disconnected" };
};

const setStatus = (status: Connection["status"]) =>
  act(() => {
    useDeviceStore.setState((s) => ({
      savedConnections: s.savedConnections.map((c) => ({ ...c, status })),
    }));
  });

const renderWizard = (onFinish = vi.fn()) =>
  render(
    <MeshRegistryProvider registry={new MeshRegistry()}>
      <OnboardingWizard onFinish={onFinish} />
    </MeshRegistryProvider>,
  );

beforeEach(() => {
  useDeviceStore.setState({ savedConnections: [], activeConnectionId: null });
  localStorage.clear();
  addConnectionAndConnect.mockReset();
  removeConnection.mockClear();
  disconnect.mockClear();
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "bluetooth");
});

describe("OnboardingWizard", () => {
  it("opens on the welcome step with its heading focused", () => {
    renderWizard();
    const heading = screen.getByRole("heading", {
      name: "Welcome to Meshtastic",
    });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAccessibleDescription("Step 1 of 5 · Welcome");
  });

  it("falls back to HTTP where Bluetooth and USB are unavailable", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Get started" }));

    expect(
      screen.getByRole("heading", { name: "Connect your radio" }),
    ).toHaveFocus();
    expect(screen.getByText(/can't use Bluetooth or USB radios/)).toBeVisible();
    expect(screen.getByRole("radio", { name: /Bluetooth/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /USB Serial/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Wi-Fi/ })).toBeChecked();
    expect(screen.getByLabelText("Radio address")).toHaveValue(
      "meshtastic.local",
    );
  });

  it("flags a bad address instead of connecting", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Get started" }));
    const address = screen.getByLabelText("Radio address");
    await user.clear(address);
    await user.type(address, "not a host");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(screen.getByText(/Enter an IP address or host name/)).toBeVisible();
    expect(address).toHaveAttribute("aria-invalid", "true");
    expect(addConnectionAndConnect).not.toHaveBeenCalled();
  });

  it("connects over HTTP and shows the failure with its details", async () => {
    addConnectionAndConnect.mockImplementation(failingHttpConnect);
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Get started" }));
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(addConnectionAndConnect).toHaveBeenCalledWith(
      {
        type: "http",
        name: "meshtastic.local",
        url: "http://meshtastic.local",
      },
      undefined,
    );
    expect(
      await screen.findByRole("heading", {
        name: "Couldn't connect to your radio",
      }),
    ).toBeVisible();
    expect(screen.getByText("Radio not reachable")).toBeInTheDocument();
    expect(screen.getByText(/same network as the radio/)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Use another method" }),
    );
    expect(
      screen.getByRole("heading", { name: "Connect your radio" }),
    ).toBeVisible();
  });

  it("keeps the pairing screen when the Bluetooth picker is closed", async () => {
    const requestDevice = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("User cancelled"), { name: "NotFoundError" }),
      );
    Object.defineProperty(navigator, "bluetooth", {
      value: { requestDevice },
      configurable: true,
    });
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.queryByText(/can't use Bluetooth or USB/)).toBeNull();
    expect(screen.getByRole("radio", { name: /Bluetooth/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(requestDevice).toHaveBeenCalledOnce();
    expect(
      await screen.findByText("The list was closed before a radio was chosen."),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Pick your radio" }),
    ).toBeVisible();
    expect(addConnectionAndConnect).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "My radio isn't in the list" }),
    );
    expect(
      screen.getByText(/A radio accepts one Bluetooth connection/),
    ).toBeVisible();
  });

  it("skips to the end and remembers it", async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    renderWizard(onFinish);
    await user.click(screen.getByRole("button", { name: "Skip setup" }));

    const done = screen.getByRole("heading", { name: "You're all set" });
    expect(done).toHaveFocus();
    expect(done).toHaveAccessibleDescription("Step 5 of 5 · Done");
    await waitFor(() =>
      expect(localStorage.getItem(WELCOME_DISMISSED_KEY)).toBe("1"),
    );

    await user.click(screen.getByRole("button", { name: "Open messages" }));
    expect(onFinish).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { name: "Welcome to Meshtastic" }),
    ).toBeVisible();
  });

  it("lets a connect that hasn't answered be cancelled", async () => {
    addConnectionAndConnect.mockImplementation(pendingHttpConnect);
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Get started" }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(
      await screen.findByRole("heading", { name: /Connecting to/ }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(disconnect).toHaveBeenCalledWith(7);
    expect(
      screen.getByRole("heading", { name: "Connect your radio" }),
    ).toBeVisible();
  });

  it("gives up on a radio that never answers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      addConnectionAndConnect.mockImplementation(pendingHttpConnect);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWizard();
      await user.click(screen.getByRole("button", { name: "Get started" }));
      await user.click(screen.getByRole("button", { name: "Connect" }));
      await screen.findByRole("heading", { name: /Connecting to/ });
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(
        await screen.findByText("The radio didn't answer within 30 seconds."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Couldn't connect to your radio" }),
      ).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports a connection that drops during sync", async () => {
    addConnectionAndConnect.mockImplementation(pendingHttpConnect);
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: "Get started" }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    await screen.findByRole("heading", { name: /Connecting to/ });
    setStatus("configuring");
    setStatus("disconnected");
    expect(
      await screen.findByText("The radio disconnected before setup finished."),
    ).toBeInTheDocument();
  });
});
