import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PacketAuthenticityStrictDialog } from "./PacketAuthenticityStrictDialog.tsx";

describe("PacketAuthenticityStrictDialog", () => {
  it("explains Strict authentication and visibility consequences", () => {
    render(
      <PacketAuthenticityStrictDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/verified XEdDSA signature/i)).toBeInTheDocument();
    expect(
      screen.getByText(/successful PKI authentication/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/older firmware/i)).toBeInTheDocument();
    expect(screen.getByText(/licensed\/ham nodes/i)).toBeInTheDocument();
    expect(screen.getByText(/oversized unsigned packets/i)).toBeInTheDocument();
  });

  it("exposes explicit confirm and cancel actions", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <PacketAuthenticityStrictDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Enable Strict" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
