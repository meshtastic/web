import { Segmented, type SegmentedOption } from "@components/UI/Segmented.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

type Hop = "1" | "2" | "3" | "4";
const options: SegmentedOption<Hop>[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3", disabled: true },
  { value: "4", label: "4" },
];

const Controlled = ({ onChange }: { onChange: (v: Hop) => void }) => {
  const [value, setValue] = useState<Hop>("2");
  return (
    <Segmented
      aria-label="Hop limit"
      options={options}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

const radio = (name: string) => screen.getByRole("radio", { name });

describe("Segmented", () => {
  it("renders a labelled radio group with the value checked", () => {
    render(<Controlled onChange={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Hop limit" })).toBeTruthy();
    expect(radio("2").getAttribute("aria-checked")).toBe("true");
    expect(radio("1").getAttribute("aria-checked")).toBe("false");
  });

  it("keeps only the selected segment in the tab order", () => {
    render(<Controlled onChange={vi.fn()} />);
    expect(radio("2").tabIndex).toBe(0);
    expect(radio("1").tabIndex).toBe(-1);
    expect(radio("4").tabIndex).toBe(-1);
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.click(radio("1"));
    expect(onChange).toHaveBeenCalledWith("1");
    expect(radio("1").getAttribute("aria-checked")).toBe("true");
  });

  it("moves with arrow keys, skipping disabled segments and wrapping", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.keyDown(radio("2"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("4");
    expect(document.activeElement).toBe(radio("4"));

    fireEvent.keyDown(radio("4"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("1");

    fireEvent.keyDown(radio("1"), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("4");

    fireEvent.keyDown(radio("4"), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("1");
  });

  it("keeps a tab stop when the value is disabled", () => {
    render(
      <Segmented
        aria-label="Hop limit"
        options={options}
        value="3"
        onValueChange={vi.fn()}
      />,
    );
    expect(radio("3").tabIndex).toBe(-1);
    expect(radio("1").tabIndex).toBe(0);
  });

  it("moves from the focused segment and supports Up/Down", () => {
    const onChange = vi.fn();
    render(
      <Segmented
        aria-label="Hop limit"
        options={options}
        value="2"
        onValueChange={onChange}
      />,
    );
    // The parent ignores changes, so the tab stop stays on "2"; keys still
    // move from whichever segment has focus.
    fireEvent.keyDown(radio("4"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("1");
    fireEvent.keyDown(radio("1"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("4");
    fireEvent.keyDown(radio("4"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("1");
  });

  it("ignores other keys", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.keyDown(radio("2"), { key: "a" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not report a change when the selected segment is clicked", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.click(radio("2"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
