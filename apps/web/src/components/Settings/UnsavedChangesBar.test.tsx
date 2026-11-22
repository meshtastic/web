import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesBar } from "./UnsavedChangesBar.tsx";

describe("UnsavedChangesBar", () => {
  it("shows what saving does and wires Reset and Save", () => {
    const onReset = vi.fn();
    const onSave = vi.fn();
    render(
      <UnsavedChangesBar
        note="Saving restarts EAO1."
        onReset={onReset}
        onSave={onSave}
      />,
    );
    expect(
      screen.getByRole("region", { name: "You have unsaved changes" }),
    ).toHaveTextContent("Saving restarts EAO1.");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("blocks Save and explains why while fields are invalid", () => {
    render(
      <UnsavedChangesBar
        note="Saving restarts EAO1."
        error="Fix the highlighted fields before saving."
        saveDisabled
        onReset={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(
      screen.getByText("Fix the highlighted fields before saving."),
    ).toBeInTheDocument();
  });
});
