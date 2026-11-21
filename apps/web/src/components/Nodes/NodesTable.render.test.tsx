import { reuseUnchangedRows } from "@core/nodes/rowCache.ts";
import { makeRow, NOW } from "@core/nodes/testNodes.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NODE_ROW_PITCH, NodesTable } from "./NodesTable.tsx";
import { useNodeLabels } from "./useNodeLabels.ts";

// Counts renders per node through the avatar each row draws.
const renders = vi.hoisted(() => new Map<number, number>());
vi.mock("./NodeRowAvatar.tsx", () => ({
  NodeRowAvatar: ({ row }: { row: NodeRow }) => {
    renders.set(row.num, (renders.get(row.num) ?? 0) + 1);
    return null;
  },
}));

const onSelect = vi.fn();
const onMessage = vi.fn();
const onSort = vi.fn();

const Harness = ({
  rows,
  selectedNum,
  now = NOW,
}: {
  rows: readonly NodeRow[];
  selectedNum?: number;
  now?: number;
}) => {
  const labels = useNodeLabels(now);
  return (
    <NodesTable
      rows={rows}
      sort={{ key: "lastHeard", direction: "desc" }}
      onSort={onSort}
      selectedNum={selectedNum}
      onSelect={onSelect}
      onMessage={onMessage}
      labels={labels}
      label="Known nodes"
    />
  );
};

const build = (snrOfTwo: number) =>
  [1, 2, 3].map((num) =>
    makeRow({
      num,
      longName: `Node ${num}`,
      heardSecondsAgo: 60 * num,
      snr: num === 2 ? snrOfTwo : 1,
    }),
  );

describe("NodesTable rendering", () => {
  it("re-renders only the row whose node changed", () => {
    renders.clear();
    const first = build(1);
    const { rerender } = render(<Harness rows={first} />);
    expect([...renders.values()]).toEqual([1, 1, 1]);

    // A node update rebuilds every row; unchanged ones keep their identity.
    rerender(<Harness rows={reuseUnchangedRows(first, build(5))} />);
    expect(renders.get(1)).toBe(1);
    expect(renders.get(2)).toBe(2);
    expect(renders.get(3)).toBe(1);
  });

  it("updates last-heard text on a clock tick without re-rendering rows", () => {
    renders.clear();
    const rows = build(1);
    const { rerender } = render(<Harness rows={rows} />);
    const table = screen.getByRole("table", { name: "Known nodes" });
    expect(within(table).getByText("1 minute ago")).toBeInTheDocument();
    rerender(<Harness rows={rows} now={NOW + 60_000} />);
    expect(within(table).getByText("2 minutes ago")).toBeInTheDocument();
    expect([...renders.values()]).toEqual([1, 1, 1]);
  });

  it("re-renders only the rows whose selection changed", () => {
    renders.clear();
    const rows = build(1);
    const { rerender } = render(<Harness rows={rows} selectedNum={1} />);
    rerender(<Harness rows={rows} selectedNum={2} />);
    expect(renders.get(1)).toBe(2);
    expect(renders.get(2)).toBe(2);
    expect(renders.get(3)).toBe(1);
  });

  it("renders a window of a long list and keeps the full row count", () => {
    renders.clear();
    const rows = Array.from({ length: 500 }, (_, i) =>
      makeRow({ num: i + 1, longName: `Node ${i + 1}` }),
    );
    render(<Harness rows={rows} />);
    const table = screen.getByRole("table", { name: "Known nodes" });
    expect(table).toHaveAttribute("aria-rowcount", "501");
    expect(renders.size).toBeLessThan(100);
    // Spacer rows stand in for the rest, keeping the scroll height.
    const spacer = within(table).getAllByRole("row", { hidden: true }).at(-1);
    expect(spacer).toHaveStyle({
      height: `${(500 - renders.size) * NODE_ROW_PITCH}px`,
    });
  });
});
