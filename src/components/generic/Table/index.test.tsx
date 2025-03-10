import { describe, it, vi, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HTTP } from "@components/PageComponents/Connect/HTTP.tsx";
import { Table } from "@components/generic/Table/index.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { TableProps } from ".";


describe("Generic Table", () => {
    it("Can render an empty table.", () => {
        render(
            <Table
                headings={[]}
                rows={[]}
            />
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
            />
        );
        await screen.findByRole('table');
        expect(screen.getAllByRole("columnheader")).toHaveLength(9);
    });

    const mockDevicesWithShortNameAndConnection = [
        {user: {shortName: "TST1"}, hopsAway: "1 Hop Away", lastHeard: Date.now() },
        {user: {shortName: "TST2"}, hopsAway: "Direct", lastHeard: Date.now() },
        {user: {shortName: "TST3"}, hopsAway: "4 Hops Away", lastHeard: Date.now() },
        {user: {shortName: "TST4"}, hopsAway: "3 Hops Away", lastHeard: Date.now() }
    ];
    
    const mockRows = mockDevicesWithShortNameAndConnection.map(node => [
        <h1 data-testShortName> { node.user.shortName } </h1>,
        <><TimeAgo timestamp={node.lastHeard * 1000} /></>,
        <h1 data-testHops> { node.hopsAway } </h1>
    ])

    it("Can render and sort with headings and rows.", async () => {
        render(
            <Table
                headings={[
                    { title: "Short Name", type: "normal", sortable: true },
                    { title: "Last Heard", type: "normal", sortable: true },
                    { title: "Connection", type: "normal", sortable: true },
                ]}
                rows={mockRows}
            />
        );
        const renderedTable = await screen.findByRole('table');
        const columnHeaders = screen.getAllByRole("columnheader");
        expect(columnHeaders).toHaveLength(3);
        fireEvent.click(columnHeaders[0]);
        fireEvent.click(columnHeaders[0]);
        
        expect( [...renderedTable.querySelectorAll('[data-testShortName]')]
            .map(el=>el.textContent)
            .map(v=>v?.trim())
            .join(','))
            .toMatch('TST2,TST1,TST4,TST3');
    });
})