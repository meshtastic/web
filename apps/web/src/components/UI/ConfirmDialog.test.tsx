import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("ConfirmDialog", () => {
  it("confirms and cancels", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Reset node database?"
        description="Forgets every node."
        confirmLabel="Reset"
        onConfirm={onConfirm}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Reset node database?" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("requires the confirmation text for danger actions", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Erase everything?"
        confirmLabel="Erase"
        tone="danger"
        requireText="EAO1"
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Erase" });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    const field = screen.getByLabelText("Type EAO1 to confirm");
    fireEvent.change(field, { target: { value: "eao1" } });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    fireEvent.change(field, { target: { value: "EAO1" } });
    expect(confirm.hasAttribute("disabled")).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("forgets typed text when the parent closes and reopens it", () => {
    const props = {
      onOpenChange: vi.fn(),
      title: "Erase everything?",
      confirmLabel: "Erase",
      tone: "danger" as const,
      requireText: "EAO1",
      onConfirm: vi.fn(),
    };
    const { rerender } = render(<ConfirmDialog open {...props} />);
    fireEvent.change(screen.getByLabelText("Type EAO1 to confirm"), {
      target: { value: "EAO1" },
    });
    expect(
      screen.getByRole("button", { name: "Erase" }).hasAttribute("disabled"),
    ).toBe(false);

    rerender(<ConfirmDialog open={false} {...props} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<ConfirmDialog open {...props} />);

    const field = screen.getByLabelText("Type EAO1 to confirm");
    expect(field.getAttribute("value")).toBe("");
    expect(
      screen.getByRole("button", { name: "Erase" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
