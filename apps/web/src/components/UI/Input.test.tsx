import { Input } from "@components/UI/Input.tsx";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Input with a limit", () => {
  it("shows a byte counter and describes it", () => {
    render(
      <Input
        aria-label="Long name"
        value="héllo"
        onChange={vi.fn()}
        limit={{ max: 24, mode: "bytes" }}
      />,
    );
    expect(screen.getByText("6/24")).toBeTruthy();
    const input = screen.getByRole("textbox", { name: "Long name" });
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const description = document.getElementById(describedBy);
    expect(description?.textContent).toBe("6 of 24 bytes used");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("counts characters in chars mode", () => {
    render(
      <Input
        aria-label="Short name"
        value="👋ab"
        onChange={vi.fn()}
        limit={{ max: 4, mode: "chars" }}
      />,
    );
    expect(screen.getByText("3/4")).toBeTruthy();
  });

  it("turns invalid and announces once over the limit", () => {
    render(
      <Input
        aria-label="Short name"
        value="ABCDE"
        onChange={vi.fn()}
        limit={{ max: 4, mode: "chars" }}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Short name" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.className).toContain("border-danger-strong");
    expect(screen.getByRole("status").textContent).toBe("Over the limit");
    expect(screen.getByText("5/4").closest("[data-over]")).not.toBeNull();
  });

  it("keeps a caller's aria-describedby", () => {
    render(
      <>
        <span id="help">Help</span>
        <Input
          aria-label="Status"
          aria-describedby="help"
          value=""
          onChange={vi.fn()}
          limit={{ max: 80, mode: "bytes" }}
        />
      </>,
    );
    const ids = (
      screen.getByRole("textbox").getAttribute("aria-describedby") ?? ""
    ).split(" ");
    expect(ids[0]).toBe("help");
    expect(ids).toHaveLength(2);
  });

  it("pads the text past the measured counter and actions", () => {
    const width = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockReturnValue(90);
    render(
      <Input
        aria-label="Key"
        value="abc"
        onChange={vi.fn()}
        showCopyButton
        limit={{ max: 32, mode: "bytes" }}
      />,
    );
    expect(screen.getByRole("textbox").style.paddingRight).toBe("102px");
    width.mockRestore();
  });

  it("renders no counter without a limit", () => {
    render(<Input aria-label="Plain" value="abc" onChange={vi.fn()} />);
    expect(screen.queryByText("3/", { exact: false })).toBeNull();
  });

  it("marks dirty fields amber", () => {
    render(<Input aria-label="Dirty" variant="dirty" defaultValue="x" />);
    expect(screen.getByRole("textbox").className).toContain("border-dirty");
  });
});
