import { useAppStore } from "@core/stores";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionsDrawer } from "./ConnectionsDrawer.tsx";

vi.mock("./ConnectionsList.tsx", () => ({
  ConnectionsList: () => <div data-testid="connections-list" />,
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
