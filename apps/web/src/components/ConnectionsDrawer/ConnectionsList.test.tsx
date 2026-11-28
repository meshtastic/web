import type { Connection } from "@app/core/stores/deviceStore/types";
import type { FirmwareUpdateNudge } from "@core/firmware/useFirmwareUpdateNotice.ts";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionsList } from "./ConnectionsList.tsx";

const connectionsMock = vi.hoisted(() => ({
  connections: [] as Connection[],
  removeConnection: vi.fn(),
  disconnect: vi.fn(async () => {}),
}));

vi.mock("@app/pages/Connections/useConnections", () => ({
  useConnections: () => ({
    connections: connectionsMock.connections,
    connect: vi.fn(async () => true),
    disconnect: connectionsMock.disconnect,
    removeConnection: connectionsMock.removeConnection,
    setDefaultConnection: vi.fn(),
    refreshStatuses: vi.fn(),
    syncConnectionStatuses: vi.fn(),
  }),
}));

const downloadMock = vi.hoisted(() => vi.fn());

vi.mock("@core/utils/downloadText.ts", () => ({
  downloadTextFile: downloadMock,
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const firmwareUpdateMock = vi.hoisted(() => ({
  nudge: undefined as FirmwareUpdateNudge | undefined,
}));

vi.mock("@core/firmware/useFirmwareUpdateNotice.ts", () => ({
  useFirmwareUpdateNotice: () => firmwareUpdateMock.nudge,
}));

const http = (id: number, name: string): Connection => ({
  id,
  type: "http",
  name,
  url: `http://${name.toLowerCase()}.local`,
  createdAt: 1,
  status: "disconnected",
});

const row = (name: string) => screen.getByRole("article", { name });
const menuButton = (name: string) =>
  within(row(name)).getByRole("button", { name: "More actions" });

const openDeleteStrip = (name: string) => {
  fireEvent.pointerDown(menuButton(name), {
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
  });
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
};

const strip = (name: string) =>
  within(row(name)).queryByText(`Delete ${name}?`);

describe("ConnectionsList inline delete", () => {
  beforeEach(() => {
    connectionsMock.connections = [
      http(1, "Alpha"),
      http(2, "Bravo"),
      http(3, "Charlie"),
    ];
    connectionsMock.removeConnection.mockImplementation((id: number) => {
      connectionsMock.connections = connectionsMock.connections.filter(
        (c) => c.id !== id,
      );
    });
  });

  it("shows the SDK's reconnect attempt on the status pill", () => {
    connectionsMock.connections = [
      {
        ...http(1, "Alpha"),
        status: "connecting",
        reconnect: { attempt: 2, maxAttempts: 10 },
      },
    ];
    render(<ConnectionsList />);
    expect(
      within(row("Alpha")).getAllByText("reconnecting 2/10").length,
    ).toBeGreaterThan(0);
  });

  it("swaps the row's actions for a strip and focuses Cancel", async () => {
    render(<ConnectionsList />);
    expect(within(row("Bravo")).getByRole("button", { name: "Connect" }));

    openDeleteStrip("Bravo");

    expect(strip("Bravo")).not.toBeNull();
    expect(
      within(row("Bravo")).queryByRole("button", { name: "Connect" }),
    ).toBeNull();
    const cancel = within(row("Bravo")).getByRole("button", { name: "Cancel" });
    // The menu's focus scope hands focus over as it unmounts, a tick later.
    await waitFor(() => expect(document.activeElement).toBe(cancel));
  });

  it("Escape cancels and returns focus to the trigger", async () => {
    render(<ConnectionsList />);
    openDeleteStrip("Bravo");
    const cancel = within(row("Bravo")).getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(document.activeElement).toBe(cancel));

    fireEvent.keyDown(cancel, { key: "Escape" });

    expect(strip("Bravo")).toBeNull();
    expect(document.activeElement).toBe(menuButton("Bravo"));
    expect(connectionsMock.removeConnection).not.toHaveBeenCalled();
  });

  it("keeps only one strip open at a time", () => {
    render(<ConnectionsList />);
    openDeleteStrip("Alpha");
    expect(strip("Alpha")).not.toBeNull();

    openDeleteStrip("Charlie");

    expect(strip("Alpha")).toBeNull();
    expect(strip("Charlie")).not.toBeNull();
  });

  it("deletes and moves focus to the next row", async () => {
    const { rerender } = render(<ConnectionsList />);
    openDeleteStrip("Bravo");

    await act(async () => {
      fireEvent.click(
        within(row("Bravo")).getByRole("button", { name: "Delete" }),
      );
    });
    rerender(<ConnectionsList />);

    expect(connectionsMock.removeConnection).toHaveBeenCalledWith(2);
    expect(screen.queryByRole("article", { name: "Bravo" })).toBeNull();
    expect(document.activeElement).toBe(menuButton("Charlie"));
  });

  it("falls back to the previous row when the last one goes", async () => {
    const { rerender } = render(<ConnectionsList />);
    openDeleteStrip("Charlie");

    await act(async () => {
      fireEvent.click(
        within(row("Charlie")).getByRole("button", { name: "Delete" }),
      );
    });
    rerender(<ConnectionsList />);

    expect(document.activeElement).toBe(menuButton("Bravo"));
  });

  it("falls back to Add connection when no rows remain", async () => {
    connectionsMock.connections = [http(1, "Alpha")];
    const addRef = createRef<HTMLButtonElement>();
    const { rerender } = render(<ConnectionsList addButtonRef={addRef} />);
    openDeleteStrip("Alpha");

    await act(async () => {
      fireEvent.click(
        within(row("Alpha")).getByRole("button", { name: "Delete" }),
      );
    });
    rerender(<ConnectionsList addButtonRef={addRef} />);

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add connection" }),
    );
  });
});

describe("ConnectionsList diagnostics", () => {
  it("offers a diagnostics file under a connection's error", () => {
    connectionsMock.connections = [
      {
        ...http(1, "Alpha"),
        status: "error",
        error: "Handshake timed out during stage: Seeding Session",
      },
    ];
    render(<ConnectionsList />);
    fireEvent.click(
      within(row("Alpha")).getByRole("button", {
        name: "Download diagnostics",
      }),
    );
    expect(downloadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^meshtastic-diagnostics-.*\.txt$/),
      expect.stringContaining("Meshtastic web client diagnostics"),
    );
  });

  it("says what to close when another tab or app likely has the radio", () => {
    connectionsMock.connections = [
      {
        ...http(1, "Alpha"),
        status: "error",
        error: "The connection to the radio was lost.",
        errorKind: "interrupted",
      },
      {
        ...http(2, "Beta"),
        status: "error",
        error: "Failed to fetch",
        errorKind: "network",
      },
    ];
    render(<ConnectionsList />);
    expect(
      within(row("Alpha")).getByText(/another Meshtastic tab or app/),
    ).toBeInTheDocument();
    expect(
      within(row("Alpha")).getByText(/connected to this address/),
    ).toBeInTheDocument();
    expect(
      within(row("Beta")).queryByText(/another Meshtastic tab or app/),
    ).toBeNull();
  });

  it("does not show it when the connection has no error", () => {
    connectionsMock.connections = [http(1, "Alpha")];
    render(<ConnectionsList />);
    expect(
      within(row("Alpha")).queryByRole("button", {
        name: "Download diagnostics",
      }),
    ).not.toBeInTheDocument();
  });
});

describe("ConnectionsList firmware update notice", () => {
  beforeEach(() => {
    connectionsMock.connections = [
      { ...http(1, "Alpha"), status: "configured" },
    ];
    firmwareUpdateMock.nudge = undefined;
  });

  it("shows nothing while the radio is current or unchecked", () => {
    render(<ConnectionsList />);
    expect(screen.queryByTestId("firmware-update-notice")).toBeNull();
  });

  it("suggests the update above the connection list", () => {
    firmwareUpdateMock.nudge = {
      notice: {
        notificationKey: "firmware-update-notified:!1234abcd:heltec-v4:2.7.26",
        currentVersion: "2.7.15",
        stableVersion: "2.7.26",
        hardwareTarget: "heltec-v4",
        destination: "meshtasticFlasher",
      },
      flasherUrl: "https://flasher.meshtastic.org/?hwModel=110",
    };
    render(<ConnectionsList />);
    const notice = screen.getByTestId("firmware-update-notice");
    expect(notice).toHaveTextContent("Firmware update available");
    expect(
      notice.compareDocumentPosition(row("Alpha")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
