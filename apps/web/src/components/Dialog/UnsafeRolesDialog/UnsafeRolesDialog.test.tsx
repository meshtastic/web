import { eventBus } from "@core/utils/eventBus.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsafeRolesDialog } from "./UnsafeRolesDialog.tsx";

vi.mock("@core/utils/eventBus.ts", () => ({
  eventBus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

vi.mock("@components/UI/Typography/Link.tsx", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const setDialogOpen = vi.fn();
vi.mock("@core/stores", () => ({
  useDevice: () => ({ setDialogOpen }),
}));

describe("UnsafeRolesDialog", () => {
  it("answers the pending role choice as dismissed when closed with Esc", () => {
    const onOpenChange = vi.fn();
    render(<UnsafeRolesDialog open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(eventBus.emit).toHaveBeenCalledWith("dialog:unsafeRoles", {
      action: "dismiss",
    });
    expect(setDialogOpen).toHaveBeenCalledWith("unsafeRoles", false);
  });
});
