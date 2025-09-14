import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Checkbox", () => {
  beforeEach(cleanup);

  it("renders unchecked by default (uncontrolled)", () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    const presentation = screen.getByRole("presentation");
    expect(checkbox).not.toBeChecked();
    // unchecked -> no filled bg class
    expect(presentation).not.toHaveClass("bg-slate-500");
  });

  it("respects defaultChecked in uncontrolled mode", () => {
    render(<Checkbox defaultChecked />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders checked when controlled with checked=true", () => {
    render(<Checkbox checked />);
    const checkbox = screen.getByRole("checkbox");
    const presentation = screen.getByRole("presentation");
    expect(checkbox).toBeChecked();
    expect(presentation).toHaveClass("bg-slate-500");
  });

  it("calls onChange when clicked (uncontrolled) and toggles DOM state", () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox");
    const presentation = screen.getByRole("presentation");

    fireEvent.click(presentation);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(checkbox).toBeChecked();

    fireEvent.click(presentation);
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(checkbox).not.toBeChecked();
  });

  it("controlled: calls onChange but does not toggle without prop update", () => {
    const onChange = vi.fn();
    render(<Checkbox checked={false} onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox");
    const presentation = screen.getByRole("presentation");

    fireEvent.click(presentation);
    expect(onChange).toHaveBeenLastCalledWith(true);
    // still unchecked because parent didn't update prop
    expect(checkbox).not.toBeChecked();
  });

  it("controlled: reflects external prop changes after onChange", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Checkbox checked={false} onChange={onChange} />,
    );

    const checkbox = screen.getByRole("checkbox");
    const presentation = screen.getByRole("presentation");

    fireEvent.click(presentation);
    expect(onChange).toHaveBeenLastCalledWith(true);

    // parent updates `checked` based on onChange
    rerender(<Checkbox checked={true} onChange={onChange} />);
    expect(checkbox).toBeChecked();
    expect(presentation).toHaveClass("bg-slate-500");
  });

  it("uses provided id", () => {
    // biome-ignore lint/correctness/useUniqueElementIds: <test>
    render(<Checkbox id="custom-id" />);
    expect(screen.getByRole("checkbox").id).toBe("custom-id");
  });

  it("renders children inside the label", () => {
    render(<Checkbox>Test Label</Checkbox>);
    expect(screen.getByTestId("label-component")).toHaveTextContent(
      "Test Label",
    );
  });

  it("applies custom className to wrapper label", () => {
    const { container } = render(<Checkbox className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
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

  it("passes through additional props to the input", () => {
    render(<Checkbox data-testid="extra-prop" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "data-testid",
      "extra-prop",
    );
  });

  it("uncontrolled: toggles checked state when clicking the visual box", () => {
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
