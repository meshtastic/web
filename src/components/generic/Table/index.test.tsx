import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Table } from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Mono } from "@components/generic/Mono.tsx";
// @ts-types="react"

describe("Generic Table", () => {
  it("Can render an empty table.", () => {
    render(
      <Table
        headings={[]}
        rows={[]}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("Can render a table with headers and no rows.", async () => {
    render(
      <Table
        headings={[
          { title: "", type: "blank", sortable: false },
          { title: "Short Name", type: "normal", sortable: true },
          { title: "Long Name", type: "normal", sortable: true },
          { title: "Model", type: "normal", sortable: true },
          { title: "MAC Address", type: "normal", sortable: true },
          { title: "Last Heard", type: "normal", sortable: true },
          { title: "SNR", type: "normal", sortable: true },
          { title: "Encryption", type: "normal", sortable: false },
          { title: "Connection", type: "normal", sortable: true },
        ]}
        rows={[]}
      />,
    );
    await screen.findByRole("table");
    expect(screen.getAllByRole("columnheader")).toHaveLength(9);
  });

  // A simplified version of the rows in pages/Nodes.tsx for testing purposes
  const mockDevicesWithShortNameAndConnection = [
    {
      user: { shortName: "TST1" },
      hopsAway: 1,
      lastHeard: Date.now() + 1000,
      viaMqtt: false,
    },
    {
      user: { shortName: "TST2" },
      hopsAway: 0,
      lastHeard: Date.now() + 4000,
      viaMqtt: true,
    },
    {
      user: { shortName: "TST3" },
      hopsAway: 4,
      lastHeard: Date.now(),
      viaMqtt: false,
    },
    {
      user: { shortName: "TST4" },
      hopsAway: 3,
      lastHeard: Date.now() + 2000,
      viaMqtt: true,
    },
  ];

  const mockRows = mockDevicesWithShortNameAndConnection.map((node) => [
    <h1 data-testshortname key={node.user.shortName}>{node.user.shortName}</h1>,
    <Mono key="lastHeard" data-testheard>
      <TimeAgo timestamp={node.lastHeard * 1000} />
    </Mono>,
    <Mono key="hops" data-testhops>
      {node.lastHeard !== 0
        ? node.viaMqtt === false && node.hopsAway === 0
          ? "Direct"
          : `${node.hopsAway?.toString()} ${
            node.hopsAway ?? 0 > 1 ? "hops" : "hop"
          } away`
        : "-"}
      {node.viaMqtt === true ? ", via MQTT" : ""}
    </Mono>,
  ]);

  it("Can sort rows appropriately.", async () => {
    render(
      <Table
        headings={[
          { title: "Short Name", type: "normal", sortable: true },
          { title: "Last Heard", type: "normal", sortable: true },
          { title: "Connection", type: "normal", sortable: true },
        ]}
        rows={mockRows}
      />,
    );
    const renderedTable = await screen.findByRole("table");
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(3);

    // Will be sorted "Last heard" "asc" by default
    expect(
      [...renderedTable.querySelectorAll("[data-testshortname]")]
        .map((el) => el.textContent)
        .map((v) => v?.trim())
        .join(","),
    )
      .toMatch("TST2,TST4,TST1,TST3");

    fireEvent.click(columnHeaders[0]);

    // Re-sort by Short Name asc
    expect(
      [...renderedTable.querySelectorAll("[data-testshortname]")]
        .map((el) => el.textContent)
        .map((v) => v?.trim())
        .join(","),
    )
      .toMatch("TST1,TST2,TST3,TST4");

    fireEvent.click(columnHeaders[0]);

    // Re-sort by Short Name desc
    expect(
      [...renderedTable.querySelectorAll("[data-testshortname]")]
        .map((el) => el.textContent)
        .map((v) => v?.trim())
        .join(","),
    )
      .toMatch("TST4,TST3,TST2,TST1");

    fireEvent.click(columnHeaders[2]);

    // Re-sort by Hops Away
    expect(
      [...renderedTable.querySelectorAll("[data-testshortname]")]
        .map((el) => el.textContent)
        .map((v) => v?.trim())
        .join(","),
    )
      .toMatch("TST2,TST1,TST4,TST3");
  });
});
