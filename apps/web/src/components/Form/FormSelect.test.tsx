import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const OPTIONS: Record<string, number> = { A: 0, B: 1 };

const renderSelect = (
  validate?: (key: string) => boolean | Promise<boolean>,
) => {
  const onSubmit = vi.fn();
  render(
    <DynamicForm<{ choice: number }>
      onSubmit={onSubmit}
      defaultValues={{ choice: 0 }}
      fieldGroups={[
        {
          label: "Group",
          description: "",
          fields: [
            {
              type: "select",
              name: "choice",
              label: "Choice",
              description: "",
              validate,
              properties: { enumValue: OPTIONS },
            },
          ],
        },
      ]}
    />,
  );
  return onSubmit;
};

const pick = async (name: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByRole("option", { name }));
};

const saved = (onSubmit: ReturnType<typeof vi.fn>) =>
  onSubmit.mock.calls.map(([values]) => values.choice);

describe("SelectInput", () => {
  it("saves the chosen option", async () => {
    const onSubmit = renderSelect();
    await pick("B");
    await waitFor(() => expect(saved(onSubmit).at(-1)).toBe(1));
  });

  it("saves an option a synchronous validate accepts", async () => {
    const onSubmit = renderSelect(() => true);
    await pick("B");
    await waitFor(() => expect(saved(onSubmit).at(-1)).toBe(1));
  });

  it("saves an option once an asynchronous validate accepts it", async () => {
    let accept: (accepted: boolean) => void = () => {};
    const onSubmit = renderSelect(
      () => new Promise<boolean>((resolve) => (accept = resolve)),
    );
    await pick("B");
    expect(saved(onSubmit)).not.toContain(1);
    accept(true);
    await waitFor(() => expect(saved(onSubmit).at(-1)).toBe(1));
    expect(saved(onSubmit).filter((choice) => choice === 1)).toHaveLength(1);
    expect(screen.getByRole("combobox")).toHaveTextContent("B");
  });

  it("keeps the current option when validate refuses", async () => {
    const onSubmit = renderSelect(() => Promise.resolve(false));
    await pick("B");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(saved(onSubmit)).not.toContain(1);
    expect(screen.getByRole("combobox")).toHaveTextContent("A");
  });
});
