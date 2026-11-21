import { makeRow, NOW } from "@core/nodes/testNodes.ts";
import type { NodeSortKey } from "@core/nodes/nodeSort.ts";
import type { SortState } from "@core/nodes/sort.ts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NodesTable, type NodesTableProps } from "./NodesTable.tsx";
import { useNodeLabels } from "./useNodeLabels.ts";

const rows = [
  makeRow(
    {
      num: 1,
      longName: "IB North",
      shortName: "IB-N",
      heardSecondsAgo: 180,
      hopsAway: 2,
      snr: -9,
      isFavorite: true,
    },
    { myNodeNum: 9 },
  ),
  makeRow(
    {
      num: 9,
      longName: "My radio",
      shortName: "ME",
      heardSecondsAgo: 10,
      hopsAway: 0,
      snr: 0,
    },
    { myNodeNum: 9 },
  ),
];

const Harness = (
  props: Omit<NodesTableProps, "labels" | "label"> & {
    sort: SortState<NodeSortKey>;
  },
) => {
  const labels = useNodeLabels(NOW);
  return <NodesTable {...props} labels={labels} label="Known nodes" />;
};

const setup = (selectedNum?: number) => {
  const onSort = vi.fn();
  const onSelect = vi.fn();
  const onMessage = vi.fn();
  render(
    <Harness
      rows={rows}
      sort={{ key: "lastHeard", direction: "desc" }}
      onSort={onSort}
      selectedNum={selectedNum}
      onSelect={onSelect}
      onMessage={onMessage}
    />,
  );
  return { onSort, onSelect, onMessage, user: userEvent.setup() };
};

describe("NodesTable", () => {
  it("shows the connected radio as this radio, without an SNR", () => {
    setup();
    const own = screen.getByRole("button", { name: "My radio" }).closest("tr");
    if (!own) {
      throw new Error("own row not found");
    }
    expect(within(own).getByText("This radio")).toBeInTheDocument();
    expect(within(own).queryByText(/dB/)).not.toBeInTheDocument();
    expect(
      within(own).queryByText(/Unknown hops|Direct/),
    ).not.toBeInTheDocument();
  });

  it("is a named table with sortable column headers", () => {
    setup();
    const table = screen.getByRole("table", { name: "Known nodes" });
    const lastHeard = within(table).getByRole("columnheader", {
      name: "Last heard",
    });
    expect(lastHeard).toHaveAttribute("aria-sort", "descending");
    expect(
      within(table).getByRole("columnheader", { name: "Hops" }),
    ).toHaveAttribute("aria-sort", "none");
  });

  it("sorts by a column when its header button is pressed", async () => {
    const { onSort, user } = setup();
    await user.click(screen.getByRole("button", { name: "SNR" }));
    expect(onSort).toHaveBeenCalledWith("snr");
    await user.click(screen.getByRole("button", { name: "Node" }));
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("selects a node from its name, by keyboard too", async () => {
    const { onSelect, user } = setup();
    screen.getByRole("button", { name: "IB North" }).focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("marks the selected node", () => {
    setup(1);
    expect(screen.getByRole("button", { name: "IB North" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("messages a node without selecting it", async () => {
    const { onMessage, onSelect, user } = setup();
    await user.click(screen.getByRole("button", { name: "Message IB North" }));
    expect(onMessage).toHaveBeenCalledWith(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("offers no Message button for this device", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "Message My radio" }),
    ).not.toBeInTheDocument();
  });

  it("shows hops, SNR and last heard, and announces favourites", () => {
    setup();
    const row = screen.getByRole("row", { name: /IB North/u });
    expect(within(row).getByText("2 hops")).toBeInTheDocument();
    expect(within(row).getByText("-9.0 dB")).toBeInTheDocument();
    expect(within(row).getByText("3 minutes ago")).toBeInTheDocument();
    expect(within(row).getByText("Favorite")).toBeInTheDocument();
  });
});
