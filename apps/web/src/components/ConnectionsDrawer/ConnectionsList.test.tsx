import type { Connection } from "@app/core/stores/deviceStore/types";
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

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: vi.fn() }),
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
