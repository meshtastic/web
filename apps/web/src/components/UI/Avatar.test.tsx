import { Avatar } from "@components/UI/Avatar.tsx";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface NodeLike {
  user?: { longName?: string; shortName?: string };
}

const node = vi.hoisted(() => {
  const state: { current: NodeLike | undefined } = { current: undefined };
  return state;
});

vi.mock("@app/core/hooks/useNodesAsProto.ts", () => ({
  useNodeAsProto: () => node.current,
}));

describe("Avatar", () => {
  beforeEach(() => {
    node.current = { user: { longName: "COULLS_BASE", shortName: "0c40" } };
  });

  it("is named after the node", () => {
    render(<Avatar nodeNum={0x71275a97} />);
    expect(screen.getByRole("img", { name: "COULLS_BASE" }).textContent).toBe(
      "0c40",
    );
  });

  it("falls back to the localised id name for unnamed nodes", () => {
    node.current = undefined;
    render(<Avatar nodeNum={0x71275a97} />);
    expect(screen.getByRole("img", { name: "Meshtastic 5A97" })).toBeTruthy();
  });

  it("puts favourite and lock status in the accessible name", () => {
    render(<Avatar nodeNum={0x71275a97} showFavorite showError />);
    const name = screen.getByRole("img").getAttribute("aria-label") ?? "";
    expect(name.startsWith("COULLS_BASE, ")).toBe(true);
    expect(name.split(", ")).toHaveLength(3);
  });

  it("decorative avatars skip the name but keep status", () => {
    const { container } = render(
      <Avatar nodeNum={0x71275a97} decorative showFavorite />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly?.textContent).not.toBe("");
    expect(container.textContent).not.toContain("COULLS_BASE");
  });
});
