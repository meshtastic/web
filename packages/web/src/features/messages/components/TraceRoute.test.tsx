import { useNodes } from "@data/hooks";
import type { Node } from "@data/schema";
import { useMyNode } from "@shared/hooks/useMyNode";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TraceRoute } from "./TraceRoute.tsx";

vi.mock("@shared/hooks/useMyNode");
vi.mock("@data/hooks");

describe("TraceRoute", () => {
  const fromUser = {
    longName: "Source Node",
    shortName: "Source",
    nodeNum: 100,
  };

  const toUser = {
    longName: "Destination Node",
    shortName: "Destination",
    nodeNum: 200,
  };

  const mockNodes: Partial<Node>[] = [
    {
      nodeNum: 1,
      longName: "Node A",
      shortName: "NA",
    },
    {
      nodeNum: 2,
      longName: "Node B",
      shortName: "NB",
    },
    {
      nodeNum: 3,
      longName: "Node C",
      shortName: "NC",
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useMyNode).mockReturnValue({
      myNodeNum: 123456789,
      myNode: undefined,
    });
    vi.mocked(useNodes).mockReturnValue({
      nodes: mockNodes as Node[],
      nodeMap: new Map(),
    });
  });

  it("renders the route to destination with SNR values", () => {
    render(
      <TraceRoute
        from={fromUser}
        to={toUser}
        route={[1, 2]}
        snrTowards={[10, 20, 30]}
      />,
    );

    expect(screen.getByText("Source Node")).toBeInTheDocument();
    expect(screen.getByText("Destination Node")).toBeInTheDocument();
    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getByText("Node B")).toBeInTheDocument();

    expect(screen.getAllByText(/↓/)).toHaveLength(3);
    expect(screen.getByText("↓ 10dBm")).toBeInTheDocument();
    expect(screen.getByText("↓ 20dBm")).toBeInTheDocument();
    expect(screen.getByText("↓ 30dBm")).toBeInTheDocument();
  });

  it("renders the route back when provided", () => {
    render(
      <TraceRoute
        from={fromUser}
        to={toUser}
        route={[1]}
        snrTowards={[15, 25]}
        routeBack={[3]}
        snrBack={[35, 45]}
      />,
    );

    // Check for the translated title
    expect(screen.getByText("Route back:")).toBeInTheDocument();

    // With route back, both names appear twice
    expect(screen.getAllByText("Source Node")).toHaveLength(2);
    expect(screen.getAllByText("Destination Node")).toHaveLength(2);

    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getByText("Node C")).toBeInTheDocument();

    expect(screen.getByText("↓ 15dBm")).toBeInTheDocument();
    expect(screen.getByText("↓ 25dBm")).toBeInTheDocument();
    expect(screen.getByText("↓ 35dBm")).toBeInTheDocument();
    expect(screen.getByText("↓ 45dBm")).toBeInTheDocument();
  });

  it("renders '??' for missing SNR values", () => {
    render(<TraceRoute from={fromUser} to={toUser} route={[1]} />);

    expect(screen.getByText("Node A")).toBeInTheDocument();
    // Check for translated '??' placeholder
    expect(screen.getAllByText(/↓ \?\?dBm/)).toHaveLength(2);
  });
});
