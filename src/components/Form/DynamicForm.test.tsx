import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@core/utils/test.tsx";
import { DynamicForm } from "./DynamicForm.tsx";
import { z } from "zod/v4";
import { useAppStore } from "@core/stores/appStore.ts";
import userEvent from "@testing-library/user-event";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string | string[]) => (Array.isArray(key) ? key[0] : key),
  }),
}));

const addErrorMock = vi.fn();
const removeErrorMock = vi.fn();

vi.mock("@core/stores/appStore.ts", () => ({
  useAppStore: () => ({
    addError: addErrorMock,
    removeError: removeErrorMock,
  }),
}));

describe.skip("DynamicForm", () => {
  const schema = z.object({
    name: z.string().min(3, { message: "Too short" }),
  });

  const fieldGroups = [
    {
      label: "Test Group",
      description: "Testing validation",
      fields: [
        {
          type: "text",
          id: "name",
          name: "name",
          label: "Name",
          description: "Enter your name",
          properties: {},
        },
      ],
    },
  ];

  it("shows validation error when input is too short", async () => {
    render(
      <DynamicForm<z.infer<typeof schema>>
        onSubmit={vi.fn()}
        validationSchema={schema}
        defaultValues={{ name: "" }}
        fieldGroups={fieldGroups}
      />,
    );
    const input = screen.getByLabelText("Name") as HTMLInputElement;

    fireEvent.input(input, { target: { value: "ab" } });

    const error = await screen.findByText(
      "formValidation.tooSmall.string",
    );
    expect(error).toBeVisible();
  });

  it("clears validation error when input becomes valid", async () => {
    render(
      <DynamicForm<z.infer<typeof schema>>
        onSubmit={vi.fn()}
        validationSchema={schema}
        defaultValues={{ name: "" }}
        fieldGroups={fieldGroups}
      />,
    );
    const input = screen.getByLabelText("Name") as HTMLInputElement;

    fireEvent.input(input, { target: { value: "ab" } });
    expect(
      await screen.findByText("formValidation.tooSmall.string"),
    ).toBeVisible();

    fireEvent.input(input, { target: { value: "abcd" } });
    await waitFor(() =>
      expect(
        screen.queryByText("formValidation.tooSmall.string"),
      ).toBeNull()
    );
  });

  it("calls onSubmit when form is valid onChange", async () => {
    const onSubmit = vi.fn();
    render(
      <DynamicForm<z.infer<typeof schema>>
        onSubmit={onSubmit}
        validationSchema={schema}
        defaultValues={{ name: "" }}
        fieldGroups={fieldGroups}
      />,
    );

    const input = screen.getByLabelText("Name") as HTMLInputElement;

    fireEvent.input(input, { target: { value: "ab" } });
    expect(
      await screen.findByText("formValidation.tooSmall.string"),
    ).toBeVisible();

    fireEvent.input(input, { target: { value: "abcd" } });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith(
      { name: "abcd" },
      expect.any(Object),
    );
  });

  it("renders a button and only calls onSubmit on click with submitType='onSubmit'", async () => {
    // Use the userEvent setup
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DynamicForm<z.infer<typeof schema>>
        onSubmit={onSubmit}
        submitType="onSubmit"
        hasSubmitButton
        validationSchema={schema}
        defaultValues={{ name: "" }}
        fieldGroups={fieldGroups}
      />,
    );

    const nameInput = screen.getByLabelText("Name");
    const submitButton = screen.getByRole("button", { name: /submit/i });

    expect(submitButton).toBeInTheDocument();
    await user.type(nameInput, "ab");

    expect(await screen.findByText("formValidation.tooSmall.string"))
      .toBeInTheDocument();
    await user.click(submitButton);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(nameInput);
    await user.type(nameInput, "abcd");

    await waitFor(() => {
      expect(screen.queryByText("formValidation.tooSmall.string")).not
        .toBeInTheDocument();
    });
    await user.click(submitButton);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: "abcd" }, expect.any(Object));
  });

  it("renders defaultValues correctly", () => {
    render(
      <DynamicForm<{ name: string }>
        onSubmit={vi.fn()}
        // no validationSchema
        defaultValues={{ name: "Alice" }}
        fieldGroups={[
          {
            label: "Group",
            description: "",
            fields: [
              {
                type: "text",
                name: "name",
                label: "Name",
                description: "",
                properties: {},
              },
            ],
          },
        ]}
      />,
    );
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("toggles disabled state based on disabledBy rules", async () => {
    const schema = z.object({
      enable: z.boolean(),
      follow: z.string(),
    });
    render(
      <DynamicForm<z.infer<typeof schema>>
        onSubmit={vi.fn()}
        validationSchema={schema}
        defaultValues={{ enable: false, follow: "" }}
        fieldGroups={[
          {
            label: "Group",
            description: "",
            fields: [
              {
                type: "toggle",
                name: "enable",
                label: "enable",
                description: "",
              },
              {
                type: "text",
                name: "follow",
                label: "follow",
                description: "",
                disabledBy: [{ fieldName: "enable" }],
                properties: {},
              },
            ],
          },
        ]}
      />,
    );
    const enable = screen.getByRole("switch", {
      name: "enable",
    }) as HTMLInputElement;

    const follow = screen.getByLabelText("follow") as HTMLInputElement;
    await waitFor(() => {
      expect(enable.getAttribute("aria-checked")).toBe("false");
      expect(follow).toBeDisabled();
    });

    fireEvent.click(enable);
    await waitFor(() => {
      expect(enable.getAttribute("aria-checked")).toBe("true");
      expect(follow).not.toBeDisabled();
    });
  });

  it("always calls onSubmit onChange when no validationSchema is provided", async () => {
    const onSubmit = vi.fn();
    render(
      <DynamicForm<{ foo: string }>
        onSubmit={onSubmit}
        // no validationSchema
        defaultValues={{ foo: "" }}
        fieldGroups={[
          {
            label: "G",
            description: "",
            fields: [
              {
                type: "text",
                name: "foo",
                label: "Foo",
                description: "",
                properties: {},
              },
            ],
          },
        ]}
      />,
    );
    const input = screen.getByLabelText("Foo") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "bar" } });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({ foo: "bar" }, expect.any(Object));
    });
  });

  it("syncs errors to appStore when formId is set", async () => {
    const { addError, removeError } = useAppStore();
    const schema = z.object({ foo: z.string().min(2) });
    const groups = [
      {
        label: "G",
        description: "",
        fields: [
          {
            type: "text",
            name: "foo",
            label: "Foo",
            description: "",
            properties: {},
          },
        ],
      },
    ];

    render(
      <DynamicForm<z.infer<typeof schema>>
        onSubmit={vi.fn()}
        formId="myForm"
        validationSchema={schema}
        defaultValues={{ foo: "" }}
        fieldGroups={groups}
      />,
    );
    const input = screen.getByLabelText("Foo") as HTMLInputElement;

    fireEvent.input(input, { target: { value: "a" } });
    await screen.findByText(/tooSmall/i);

    expect(addError).toHaveBeenCalledWith("foo", "");
    expect(addError).toHaveBeenCalledWith("myForm", "");

    fireEvent.input(input, { target: { value: "abc" } });
    await waitFor(() => {
      expect(removeError).toHaveBeenCalledWith("foo");
      expect(removeError).toHaveBeenCalledWith("myForm");
    });
  });
});
