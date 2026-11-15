import { useAppStore } from "@core/stores";
import type React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionsDrawer } from "./ConnectionsDrawer.tsx";

vi.mock("./ConnectionsList.tsx", () => ({
  ConnectionsList: ({
    addButtonRef,
  }: {
    addButtonRef?: React.Ref<HTMLButtonElement>;
  }) => (
    <div data-testid="connections-list">
      <button
        type="button"
        ref={addButtonRef}
        onClick={() => useAppStore.getState().setConnectionsView("add")}
      >
        Add connection
      </button>
    </div>
  ),
}));

vi.mock("./AddConnectionForm.tsx", () => ({
  AddConnectionForm: () => <form data-testid="add-connection-form" />,
}));

vi.mock("@app/pages/Connections/useConnections", () => ({
  useConnections: () => ({ addConnectionAndConnect: vi.fn() }),
}));

describe("ConnectionsDrawer", () => {
  beforeEach(() => {
    act(() => useAppStore.getState().closeConnections());
  });

  describe("forced open (no device)", () => {
    it("renders without a close button and ignores Escape", () => {
      render(<ConnectionsDrawer forced />);

      expect(screen.getByRole("dialog")).not.toBeNull();
      expect(screen.getByTestId("connections-list")).not.toBeNull();
      expect(
        screen.queryByRole("button", { name: "Close connections" }),
      ).toBeNull();

      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: "Escape",
      });

      expect(screen.getByRole("dialog")).not.toBeNull();
      expect(useAppStore.getState().connectionsDrawer.open).toBe(false);
    });
  });

  describe("dismissable (device connected)", () => {
    it("renders nothing until opened from the store", () => {
      render(<ConnectionsDrawer forced={false} />);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByTestId("connections-list")).toBeNull();
    });

    it("closes from the close button", () => {
      render(<ConnectionsDrawer forced={false} />);
      act(() => useAppStore.getState().openConnections());

      fireEvent.click(
        screen.getByRole("button", { name: "Close connections" }),
      );

      expect(useAppStore.getState().connectionsDrawer.open).toBe(false);
    });

    it("closes on Escape", () => {
      render(<ConnectionsDrawer forced={false} />);
      act(() => useAppStore.getState().openConnections());
      const dialog = screen.getByRole("dialog");

      fireEvent.keyDown(dialog, { key: "Escape" });

      expect(useAppStore.getState().connectionsDrawer.open).toBe(false);
    });
  });
});

describe("ConnectionsDrawer views", () => {
  beforeEach(() => {
    act(() => useAppStore.getState().closeConnections());
  });

  it("opens on the list by default and on the add view when asked", () => {
    render(<ConnectionsDrawer forced={false} />);

    act(() => useAppStore.getState().openConnections());
    expect(screen.getByRole("heading", { name: /Connections/ })).not.toBeNull();
    expect(
      screen.queryByRole("button", { name: "Back to connections" }),
    ).toBeNull();

    act(() => useAppStore.getState().openConnections("add"));
    expect(
      screen.getByRole("heading", { name: "Add connection" }),
    ).not.toBeNull();
  });

  it("focuses the title on push and the Add connection button on pop", () => {
    render(<ConnectionsDrawer forced={false} />);
    act(() => useAppStore.getState().openConnections());

    const addButton = screen.getByRole("button", { name: "Add connection" });
    fireEvent.click(addButton);

    const title = screen.getByRole("heading", { name: "Add connection" });
    expect(document.activeElement).toBe(title);

    fireEvent.click(
      screen.getByRole("button", { name: "Back to connections" }),
    );

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add connection" }),
    );
    expect(useAppStore.getState().connectionsDrawer.view).toBe("list");
  });
});
