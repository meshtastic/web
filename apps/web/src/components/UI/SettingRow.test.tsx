import {
  SettingRow,
  settingRowDescribedBy,
} from "@components/UI/SettingRow.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("SettingRow", () => {
  it("switch: labels the switch and wires help text", () => {
    const onCheckedChange = vi.fn();
    render(
      <SettingRow
        kind="switch"
        label="Transmit"
        help="Turn off to only listen."
        checked
        onCheckedChange={onCheckedChange}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Transmit" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    const helpId = toggle.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(helpId)?.textContent).toBe(
      "Turn off to only listen.",
    );
    fireEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it("text: edits the value and counts bytes", () => {
    const onValueChange = vi.fn();
    render(
      <SettingRow
        kind="text"
        label="Long name"
        value="EAO1"
        limit={{ max: 24, mode: "bytes" }}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Long name" });
    fireEvent.change(input, { target: { value: "EAO1 Downtown" } });
    expect(onValueChange).toHaveBeenCalledWith("EAO1 Downtown");
    expect(screen.getByText("4/24")).toBeTruthy();
  });

  it("text: dirty rows get the amber border and a hidden note", () => {
    render(
      <SettingRow
        kind="text"
        label="Frequency slot"
        value="1"
        dirty
        onValueChange={vi.fn()}
      />,
    );
    expect(
      // The note sits outside the label, so the name stays the label.
      screen.getByRole("textbox", { name: "Frequency slot" }).className,
    ).toContain("border-dirty");
    expect(screen.getByText("(Unsaved changes)")).toBeTruthy();
  });

  it("segmented: typed options, labelled by the row", () => {
    const onValueChange = vi.fn<(value: "1" | "3" | "7") => void>();
    render(
      <SettingRow
        kind="segmented"
        label="Hop limit"
        value="3"
        options={[
          { value: "1", label: "1" },
          { value: "3", label: "3" },
          { value: "7", label: "7" },
        ]}
        onValueChange={onValueChange}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Hop limit" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "7" }));
    expect(onValueChange).toHaveBeenCalledWith("7");
  });

  it("select: shows the selected option", () => {
    render(
      <SettingRow
        kind="select"
        label="Region"
        value="US"
        options={[
          { value: "UNSET", label: "Not set" },
          { value: "US", label: "United States" },
        ]}
        onValueChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Region" });
    expect(trigger.textContent).toContain("United States");
  });

  it("readonlyKey: shows the value with a copy action", () => {
    render(<SettingRow kind="readonlyKey" label="Node ID" value="!71275a97" />);
    expect(
      screen.getByRole("group", { name: "Node ID" }).textContent,
    ).toContain("!71275a97");
    expect(
      screen.getByRole("button", { name: "Copy to clipboard" }),
    ).toBeTruthy();
  });

  it("button: runs the action, described by the row label", () => {
    const onAction = vi.fn();
    render(
      <SettingRow
        kind="button"
        label="Reset node database"
        help="Forgets every node."
        actionLabel="Reset…"
        tone="danger"
        onAction={onAction}
      />,
    );
    const button = screen.getByRole("button", { name: "Reset…" });
    const described = (button.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["Reset node database", "Forgets every node."]);
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("button: a dirty row shows the amber mark", () => {
    const { container } = render(
      <SettingRow
        kind="button"
        label="Position"
        dirty
        actionLabel="Open"
        onAction={vi.fn()}
      />,
    );
    expect(container.querySelector(".bg-dirty")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
  });

  it("custom: labels the supplied control and shows its error", () => {
    render(
      <SettingRow
        kind="custom"
        label="Latitude"
        controlId="lat"
        help="Degrees."
        error="Too precise"
        stacked
      >
        <input
          id="lat"
          aria-describedby={settingRowDescribedBy("lat", {
            help: true,
            error: true,
          })}
        />
      </SettingRow>,
    );
    const input = screen.getByRole("textbox", { name: "Latitude" });
    expect(input).toHaveAccessibleDescription("Degrees. Too precise");
    expect(screen.getByText("Too precise").className).toContain("text-danger");
  });

  it("text: an error marks the input invalid and describes it", () => {
    render(
      <SettingRow
        kind="text"
        label="Long name"
        value="x"
        error="Too long"
        onValueChange={vi.fn()}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Long name" });
    expect(input.className).toContain("border-danger-strong");
    const described = (input.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain("Too long");
  });
});
