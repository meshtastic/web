import { useNodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { makeRow, NOW } from "@core/nodes/testNodes.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MapNodeList, type MapNodeListProps } from "./MapNodeList.tsx";
import { loadMapTranslations } from "./mapTestI18n.ts";

beforeAll(loadMapTranslations);

const rows = [
  makeRow({ num: 9, longName: "EAO1", lat: 1, lng: 1 }, { myNodeNum: 9 }),
  makeRow(
    {
      num: 2,
      longName: "COULLS_BASE",
      lat: 1.1,
      lng: 1,
      hopsAway: 1,
      heardSecondsAgo: 60,
    },
    { myNodeNum: 9 },
  ),
];

const Harness = (props: Omit<MapNodeListProps, "labels">) => (
  <MapNodeList {...props} labels={useNodeLabels(NOW)} />
);

describe("MapNodeList", () => {
  it("lists nodes with their hops and last heard", () => {
    render(
      <Harness
        rows={rows}
        total={2}
        search=""
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("list", { name: "Nodes on map" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 nodes with position")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getByText("1 hop · heard 1 minute ago")).toBeInTheDocument();
  });

  it("picks a node and marks the selected one", async () => {
    const onSelect = vi.fn();
    render(
      <Harness
        rows={rows}
        total={2}
        search=""
        onSearchChange={vi.fn()}
        selectedNum={9}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", { name: /EAO1/u })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /COULLS_BASE/u }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("searches with a labelled box", async () => {
    const onSearchChange = vi.fn();
    render(
      <Harness
        rows={rows}
        total={2}
        search=""
        onSearchChange={onSearchChange}
        onSelect={vi.fn()}
      />,
    );
    await userEvent
      .setup()
      .type(
        screen.getByRole("searchbox", { name: "Find a node on the map" }),
        "c",
      );
    expect(onSearchChange).toHaveBeenCalledWith("c");
  });

  it("explains an empty list", () => {
    const { rerender } = render(
      <Harness
        rows={[]}
        total={0}
        search=""
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No node has shared a position yet."),
    ).toBeInTheDocument();
    rerender(
      <Harness
        rows={[]}
        total={3}
        search="zz"
        onSearchChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("No nodes match.")).toBeInTheDocument();
  });
});
