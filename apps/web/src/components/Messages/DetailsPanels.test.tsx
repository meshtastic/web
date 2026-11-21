import { DEFAULT_CHANNEL_HEARD_SORT } from "@core/nodes/nodeSort.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ChannelDetailsPanel,
  type ChannelDetailsPanelProps,
  type HeardNodeView,
} from "./DetailsPanels.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: ComponentPropsWithoutRef<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const heard: HeardNodeView[] = [
  {
    num: 1,
    name: "Longfellow Ridge Repeater",
    initials: "LR",
    isFavorite: true,
    meta: "4 hops · via MQTT · 17 minutes ago",
  },
  {
    num: 2,
    name: "Dockside",
    initials: "DS",
    isFavorite: false,
    meta: "Direct · 2 minutes ago",
  },
];

const setup = (props: Partial<ChannelDetailsPanelProps> = {}) => {
  const onHeardSortChange = vi.fn();
  const onHeardQueryChange = vi.fn();
  render(
    <ChannelDetailsPanel
      primary
      encryption="aes256"
      muted={false}
      heard={heard}
      heardSort={DEFAULT_CHANNEL_HEARD_SORT}
      onHeardSortChange={onHeardSortChange}
      heardQuery=""
      onHeardQueryChange={onHeardQueryChange}
      heardTotal={heard.length}
      totalNodes={12}
      onShareQr={vi.fn()}
      onOpenNode={vi.fn()}
      {...props}
    />,
  );
  return { onHeardSortChange, onHeardQueryChange, user: userEvent.setup() };
};

describe("ChannelDetailsPanel recently heard search", () => {
  it("keeps search behind an icon until it is opened", async () => {
    const { user, onHeardQueryChange } = setup();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    const open = screen.getByRole("button", { name: "Search recently heard" });
    expect(open).toHaveAttribute("aria-expanded", "false");

    await user.click(open);
    const field = screen.getByRole("searchbox", {
      name: "Search recently heard",
    });
    expect(field).toHaveFocus();
    await user.type(field, "d");
    expect(onHeardQueryChange).toHaveBeenLastCalledWith("d");
  });

  it("Escape closes the search, clears it and returns focus to the icon", async () => {
    const { user, onHeardQueryChange } = setup({ heardQuery: "dock" });
    await user.click(
      screen.getByRole("button", { name: "Search recently heard" }),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(onHeardQueryChange).toHaveBeenLastCalledWith("");
    expect(
      screen.getByRole("button", { name: "Search recently heard" }),
    ).toHaveFocus();
  });

  it("the close button also clears the search", async () => {
    const { user, onHeardQueryChange } = setup();
    await user.click(
      screen.getByRole("button", { name: "Search recently heard" }),
    );
    await user.click(screen.getByRole("button", { name: "Close search" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(onHeardQueryChange).toHaveBeenLastCalledWith("");
  });

  it("says when nothing matches", () => {
    setup({ heard: [], heardQuery: "zzz", heardTotal: 2 });
    expect(
      screen.getByText("No recently heard nodes match “zzz”."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No nodes heard on this channel/),
    ).not.toBeInTheDocument();
  });

  it("offers no search when nothing was heard", () => {
    setup({ heard: [], heardTotal: 0 });
    expect(
      screen.queryByRole("button", { name: "Search recently heard" }),
    ).not.toBeInTheDocument();
  });
});

describe("ChannelDetailsPanel recently heard", () => {
  it("names the sort control after the current sort and keeps the window as a caption", () => {
    setup();
    expect(
      screen.getByRole("button", {
        name: "Sort recently heard: Last heard",
      }),
    ).toHaveTextContent("Last heard");
    expect(screen.getByText("Last 2 h")).toBeInTheDocument();
  });

  it("says favorites come first when they do", () => {
    setup({
      heardSort: { ...DEFAULT_CHANNEL_HEARD_SORT, favoritesFirst: true },
    });
    expect(
      screen.getByRole("button", {
        name: "Sort recently heard: Favorites, then Last heard",
      }),
    ).toBeInTheDocument();
  });

  it("offers only the columns the list supports and reports a pick", async () => {
    const { onHeardSortChange, user } = setup();
    await user.click(
      screen.getByRole("button", { name: "Sort recently heard: Last heard" }),
    );
    const options = screen
      .getAllByRole("menuitemradio")
      .map((item) => item.textContent);
    expect(options).toEqual([
      "Last heard",
      "Name",
      "Hops",
      "SNR",
      "Battery",
      "Distance",
    ]);
    expect(
      screen.getByRole("menuitemradio", { name: "Last heard" }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: "Name" }));
    expect(onHeardSortChange).toHaveBeenCalledWith({
      key: "name",
      direction: "asc",
      favoritesFirst: false,
    });
  });

  it("turns favorites first on in front of the current column", async () => {
    const { onHeardSortChange, user } = setup({
      heardSort: { key: "snr", direction: "desc", favoritesFirst: false },
    });
    await user.click(
      screen.getByRole("button", { name: "Sort recently heard: SNR" }),
    );
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: "Favorites first" }),
    );
    expect(onHeardSortChange).toHaveBeenCalledWith({
      key: "snr",
      direction: "desc",
      favoritesFirst: true,
    });
  });

  it("labels each row with its name, favorite and meta", () => {
    setup();
    expect(
      screen.getByRole("button", {
        name: "Message Longfellow Ridge Repeater, Favorite, 4 hops · via MQTT · 17 minutes ago",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Message Dockside, Direct · 2 minutes ago",
      }),
    ).toBeInTheDocument();
  });
});
