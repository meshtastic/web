import type { ResultGroup } from "@core/commandMenu/results.ts";
import type { Command } from "@core/commandMenu/types.ts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CommandMenuView,
  type CommandMenuViewProps,
} from "./CommandMenuView.tsx";

const primary: Command = {
  kind: "conversation",
  id: "conversation:channel:0",
  group: "conversations",
  label: "Primary",
  hint: "3 unread",
  target: { type: "broadcast", channel: 0 },
  unread: 3,
};

const lora: Command = {
  kind: "navigate",
  id: "settings:lora",
  group: "settings",
  label: "LoRa",
  hint: "Region, preset, hop limit",
  icon: "lora",
  target: { to: "/settings/lora" },
};

const groups: ResultGroup[] = [
  { id: "conversations", commands: [primary] },
  { id: "settings", commands: [lora] },
];

const renderView = (overrides: Partial<CommandMenuViewProps> = {}) => {
  const props: CommandMenuViewProps = {
    open: true,
    onOpenChange: vi.fn(),
    query: "",
    onQueryChange: vi.fn(),
    groups,
    page: null,
    onBack: vi.fn(),
    pinned: [],
    onSelect: vi.fn(),
    ...overrides,
  };
  render(<CommandMenuView {...props} />);
  return props;
};

describe("CommandMenuView", () => {
  it("renders a labelled search field and grouped options", () => {
    renderView();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAccessibleName(
      "Search commands",
    );
    expect(
      screen.getByRole("group", { name: "Conversations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Primary/ })).toHaveTextContent(
      "3 unread",
    );
    expect(screen.getByRole("option", { name: /LoRa/ })).toBeInTheDocument();
  });

  it("selects the first row and runs it with Enter", async () => {
    const props = renderView();
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{ArrowDown}{Enter}");
    expect(props.onSelect).toHaveBeenCalledWith(lora);
  });

  it("runs a row on click", async () => {
    const props = renderView();
    await userEvent
      .setup()
      .click(screen.getByRole("option", { name: /Primary/ }));
    expect(props.onSelect).toHaveBeenCalledWith(primary);
  });

  it("shows the empty state", () => {
    renderView({ groups: [], query: "zzz" });
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  it("keeps only options inside the listbox", () => {
    renderView({ pinned: ["settings"] });
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).queryAllByRole("button")).toEqual([]);
    expect(within(listbox).getAllByRole("option")).toHaveLength(2);
  });

  it("goes back from a picker with the back button or Backspace", async () => {
    const props = renderView({ page: "traceroute", groups: [] });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Backspace}");
    expect(props.onBack).toHaveBeenCalledTimes(2);
  });

  it("keeps focus in the search field when leaving a picker", async () => {
    const Harness = () => {
      const [page, setPage] =
        useState<CommandMenuViewProps["page"]>("traceroute");
      return (
        <CommandMenuView
          open
          onOpenChange={vi.fn()}
          query=""
          onQueryChange={vi.fn()}
          groups={groups}
          page={page}
          onBack={() => setPage(null)}
          pinned={[]}
          onSelect={vi.fn()}
        />
      );
    };
    render(<Harness />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("shows navigation shortcuts with a spoken name", () => {
    const map: Command = {
      kind: "navigate",
      id: "goto:map",
      group: "navigation",
      label: "Map",
      icon: "map",
      target: { to: "/map" },
      shortcut: ["G", "M"],
    };
    renderView({ groups: [{ id: "navigation", commands: [map] }] });
    expect(screen.getByRole("option", { name: /Map/ })).toHaveTextContent(
      "Keyboard shortcut: G then M",
    );
  });

  it("closes from the cancel button", async () => {
    const props = renderView();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
