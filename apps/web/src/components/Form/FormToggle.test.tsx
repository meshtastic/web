import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { FormAutoSaveContext } from "@components/Form/formAutoSave.ts";
import { ToggleInput } from "@components/Form/FormToggle.tsx";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

interface TestForm extends Record<string, unknown> {
  enabled: boolean;
  address: string;
}

function renderForm(onSubmit: (data: TestForm) => void) {
  return render(
    <DynamicForm<TestForm>
      onSubmit={onSubmit}
      defaultValues={{ enabled: false, address: "" }}
      fieldGroups={[
        {
          label: "Group",
          description: "Group description",
          fields: [
            { type: "toggle", name: "enabled", label: "Enabled" },
            { type: "text", name: "address", label: "Address" },
          ],
        },
      ]}
    />,
  );
}

/** Minimal host so the toggle can be tested without a surrounding form. */
function ToggleHost({ autoSave }: { autoSave: (() => void) | null }) {
  const { control } = useForm<TestForm>({
    defaultValues: { enabled: false, address: "" },
  });

  return (
    <FormAutoSaveContext.Provider value={autoSave}>
      <ToggleInput<TestForm>
        control={control}
        field={{ type: "toggle", name: "enabled", label: "Enabled" }}
      />
    </FormAutoSaveContext.Provider>
  );
}

describe("ToggleInput", () => {
  it("runs the form auto-save when the switch is toggled", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await userEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ enabled: true });
  });

  it("saves exactly once per toggle, and saves the new value both ways", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    const toggle = screen.getByRole("switch");

    await userEvent.click(toggle);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ enabled: true });

    await userEvent.click(toggle);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[0]).toMatchObject({ enabled: false });
  });

  it("saves when the switch is toggled with the keyboard", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    screen.getByRole("switch").focus();
    await userEvent.keyboard(" ");

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ enabled: true });
  });

  it("still auto-saves native inputs on change", async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    await userEvent.type(screen.getByRole("textbox"), "mqtt.example.org");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls.at(-1)?.[0]).toMatchObject({
      address: "mqtt.example.org",
    });
  });

  it("calls the auto-save trigger published by the form", async () => {
    const autoSave = vi.fn();
    render(<ToggleHost autoSave={autoSave} />);

    await userEvent.click(screen.getByRole("switch"));

    expect(autoSave).toHaveBeenCalledTimes(1);
  });

  it("does not throw when rendered without a form auto-save trigger", async () => {
    render(<ToggleHost autoSave={null} />);

    await userEvent.click(screen.getByRole("switch"));

    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked");
  });
});
