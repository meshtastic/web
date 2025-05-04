import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import React from "react";

vi.mock("@components/UI/Label.tsx", () => ({
  Label: (
    { children, className, htmlFor, id }: {
      children: React.ReactNode;
      className: string;
      htmlFor: string;
      id: string;
    },
  ) => (
    <label
      data-testid="label-component"
      className={className}
      htmlFor={htmlFor}
      id={id}
    >
      {children}
    </label>
  ),
}));

vi.mock("@core/utils/cn.ts", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useId: () => "test-id",
  };
});

describe("Checkbox", () => {
  beforeEach(cleanup);

  it("renders unchecked by default", () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText("Check")).not.toBeInTheDocument();
  });

  it("renders checked when checked prop is true", () => {
    render(<Checkbox checked />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("presentation")).toBeInTheDocument();
  });

  it("calls onChange when clicked", () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange} />);

    fireEvent.click(screen.getByRole("presentation"));
    expect(onChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole("presentation"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("uses provided id", () => {
    render(<Checkbox id="custom-id" />);
    expect(screen.getByRole("checkbox").id).toBe("custom-id");
  });

  it("generates id when not provided", () => {
    render(<Checkbox />);
    expect(screen.getByRole("checkbox").id).toBe("test-id");
  });

  it("renders children in Label component", () => {
    render(<Checkbox>Test Label</Checkbox>);
    expect(screen.getByTestId("label-component")).toHaveTextContent(
      "Test Label",
    );
  });

  it("applies custom className", () => {
    const { container } = render(<Checkbox className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("applies labelClassName to Label", () => {
    render(<Checkbox labelClassName="label-class">Test</Checkbox>);
    expect(screen.getByTestId("label-component")).toHaveClass("label-class");
  });

  it("disables checkbox when disabled prop is true", () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("presentation")).toHaveClass("opacity-50");
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange} disabled />);

    fireEvent.click(screen.getByRole("presentation"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sets required attribute when required prop is true", () => {
    render(<Checkbox required />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("required");
  });

  it("sets name attribute when name prop is provided", () => {
    render(<Checkbox name="test-name" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("name", "test-name");
  });

  it("passes through additional props", () => {
    render(<Checkbox data-testid="extra-prop" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "data-testid",
      "extra-prop",
    );
  });

  it("toggles checked state correctly", () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    const presentation = screen.getByRole("presentation");

    expect(checkbox).not.toBeChecked();

    fireEvent.click(presentation);
    expect(checkbox).toBeChecked();

    fireEvent.click(presentation);
    expect(checkbox).not.toBeChecked();
  });
});
