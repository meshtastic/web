import { Mono } from "@components/generic/Mono.tsx";
import {
  type DataRow,
  type Heading,
  Table,
} from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// @ts-types="react"

describe("Generic Table", () => {
  it("Can render an empty table.", () => {
    render(<Table headings={[]} rows={[]} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("Can render a table with headers and no rows.", async () => {
    const headings: Heading[] = [
      { title: "Short Name", sortable: true },
      { title: "Last Heard", sortable: true },
      { title: "Connection", sortable: true },
    ];
    render(<Table headings={headings} rows={[]} />);
    await screen.findByRole("table");
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  // Mock data representing devices
  const mockDevices = [
    {
      id: "TST1",
      shortName: "TST1",
      hopsAway: 1,
      lastHeard: Date.now() - 3000,
      viaMqtt: false,
    },
    {
      id: "TST2",
      shortName: "TST2",
      hopsAway: 0,
      lastHeard: Date.now() - 1000,
      viaMqtt: true,
      isFavorite: true, // Favorite device
    },
    {
      id: "TST3",
      shortName: "TST3",
      hopsAway: 4,
      lastHeard: Date.now() - 5000,
      viaMqtt: false,
    },
    {
      id: "TST4",
      shortName: "TST4",
      hopsAway: 3,
      lastHeard: Date.now() - 2000,
      viaMqtt: true,
    },
  ];

  // Transform mock data into the format expected by the Table component
  const mockRows: DataRow[] = mockDevices.map((node) => ({
    id: node.id,
    isFavorite: node.isFavorite,
    cells: [
      {
        content: <b data-testid="short-name">{node.shortName}</b>,
        sortValue: node.shortName,
      },
      {
        content: (
          <Mono>
            <TimeAgo timestamp={node.lastHeard} />
          </Mono>
        ),
        sortValue: node.lastHeard,
      },
      {
        content: (
          <Mono>
            {node.lastHeard !== 0
              ? node.viaMqtt === false && node.hopsAway === 0
                ? "Direct"
                : `${node.hopsAway} ${node.hopsAway > 1 ? "hops" : "hop"} away`
              : "-"}
            {node.viaMqtt ? ", via MQTT" : ""}
          </Mono>
        ),
        sortValue: node.hopsAway,
      },
    ],
  }));

  const headings: Heading[] = [
    { title: "Short Name", sortable: true },
    { title: "Last Heard", sortable: true },
    { title: "Connection", sortable: true },
  ];

  it("Can sort rows, keeping favorites at the top", async () => {
    render(<Table headings={headings} rows={mockRows} />);
    const renderedTable = await screen.findByRole("table");
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(3);

    const getRenderedOrder = () =>
      [...renderedTable.querySelectorAll("[data-testid='short-name']")].map(
        (el) => el.textContent?.trim(),
      );

    // Default sort: "Last Heard" desc. TST2 is favorite, so it's first.
    // Then the rest are sorted by lastHeard timestamp (most recent first).
    // Order of timestamps: TST2 (latest, but favorite), TST4, TST1, TST3 (oldest).
    expect(getRenderedOrder()).toEqual(["TST2", "TST4", "TST1", "TST3"]);

    // Click "Short Name" to sort asc
    fireEvent.click(columnHeaders[0]);
    // TST2 is favorite, so it's first. Then TST1, TST3, TST4 alphabetically.
    expect(getRenderedOrder()).toEqual(["TST2", "TST1", "TST3", "TST4"]);

    // Click "Short Name" again to sort desc
    fireEvent.click(columnHeaders[0]);
    // TST2 is favorite, so it's first. Then TST4, TST3, TST1 reverse alphabetically.
    expect(getRenderedOrder()).toEqual(["TST2", "TST4", "TST3", "TST1"]);

    // Click "Connection" to sort by hops asc
    fireEvent.click(columnHeaders[2]);
    // TST2 is favorite (and also has 0 hops). Then sorted by hops: TST1 (1), TST4 (3), TST3 (4).
    expect(getRenderedOrder()).toEqual(["TST2", "TST1", "TST4", "TST3"]);
  });
});
