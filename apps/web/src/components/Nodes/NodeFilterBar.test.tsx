import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NodeFilterBar } from "./NodeFilterBar.tsx";

const setup = () => {
  const onSearchChange = vi.fn();
  const onQuickFilterChange = vi.fn();
  const onSortKeyChange = vi.fn();
  render(
    <NodeFilterBar
      search=""
      onSearchChange={onSearchChange}
      quickFilter="favorites"
      onQuickFilterChange={onQuickFilterChange}
      counts={{ all: 5, favorites: 2, recent: 3, direct: 1, hasPosition: 4 }}
      sortKey="lastHeard"
      onSortKeyChange={onSortKeyChange}
    />,
  );
  return {
    onSearchChange,
    onQuickFilterChange,
    onSortKeyChange,
    user: userEvent.setup(),
  };
};

describe("NodeFilterBar", () => {
  it("labels the search box", async () => {
    const { onSearchChange, user } = setup();
    await user.type(
      screen.getByRole("searchbox", { name: "Search nodes" }),
      "a",
    );
    expect(onSearchChange).toHaveBeenCalledWith("a");
  });

  it("groups the chips and marks the active one", () => {
    setup();
    const group = screen.getByRole("group", { name: "Filter nodes" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Favorites/u })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the picked chip and shows counts", async () => {
    const { onQuickFilterChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Direct 1" }));
    expect(onQuickFilterChange).toHaveBeenCalledWith("direct");
  });

  it("names the sort control after the current sort", () => {
    setup();
    expect(
      screen.getByRole("combobox", { name: "Sort nodes" }),
    ).toHaveTextContent("Sort: Last heard");
  });
});
