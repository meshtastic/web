// deno-lint-ignore-file
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsafeRolesDialog } from "@components/Dialog/UnsafeRolesDialog/UnsafeRolesDialog.tsx";
import { eventBus } from "@core/utils/eventBus.ts";
import { DeviceWrapper } from "@app/DeviceWrapper.tsx";

describe("UnsafeRolesDialog", () => {
  const mockDevice = {
    setDialogOpen: vi.fn(),
  };

  const renderWithDeviceContext = (ui: React.ReactNode) => {
    return render(
      <DeviceWrapper device={mockDevice}>
        {ui}
      </DeviceWrapper>,
    );
  };

  it("renders the dialog when open is true", () => {
    renderWithDeviceContext(
      <UnsafeRolesDialog open={true} onOpenChange={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    expect(screen.getByText(/I have read the/i)).toBeInTheDocument();
    expect(screen.getByText(/understand the implications/i))
      .toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Device Role Documentation");
    expect(links[1]).toHaveTextContent("Choosing The Right Device Role");
  });

  it("displays the correct links", () => {
    renderWithDeviceContext(
      <UnsafeRolesDialog open={true} onOpenChange={vi.fn()} />,
    );

    const docLink = screen.getByRole("link", {
      name: /Device Role Documentation/i,
    });
    const blogLink = screen.getByRole("link", {
      name: /Choosing The Right Device Role/i,
    });

    expect(docLink).toHaveAttribute(
      "href",
      "https://meshtastic.org/docs/configuration/radio/device/",
    );
    expect(blogLink).toHaveAttribute(
      "href",
      "https://meshtastic.org/blog/choosing-the-right-device-role/",
    );
  });

  it("does not allow confirmation until checkbox is checked", () => {
    renderWithDeviceContext(
      <UnsafeRolesDialog open={true} onOpenChange={vi.fn()} />,
    );

    const confirmButton = screen.getByRole("button", { name: /confirm/i });

    expect(confirmButton).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(confirmButton).toBeEnabled();
  });

  it("emits the correct event when closing via close button", () => {
    const eventSpy = vi.spyOn(eventBus, "emit");
    renderWithDeviceContext(
      <UnsafeRolesDialog open={true} onOpenChange={vi.fn()} />,
    );

    const dismissButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(dismissButton);

    expect(eventSpy).toHaveBeenCalledWith("dialog:unsafeRoles", {
      action: "dismiss",
    });
  });

  it("emits the correct event when dismissing", () => {
    const eventSpy = vi.spyOn(eventBus, "emit");
    renderWithDeviceContext(
      <UnsafeRolesDialog open={true} onOpenChange={vi.fn()} />,
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(eventSpy).toHaveBeenCalledWith("dialog:unsafeRoles", {
      action: "dismiss",
    });
  });

  it("emits the correct event when confirming", () => {
    const eventSpy = vi.spyOn(eventBus, "emit");
    renderWithDeviceContext(
      <UnsafeRolesDialog open={true} onOpenChange={vi.fn()} />,
    );

    const checkbox = screen.getByRole("checkbox");
    const confirmButton = screen.getByRole("button", { name: /confirm/i });

    fireEvent.click(checkbox);
    fireEvent.click(confirmButton);

    expect(eventSpy).toHaveBeenCalledWith("dialog:unsafeRoles", {
      action: "confirm",
    });
  });
});
