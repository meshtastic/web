import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TraceRoute } from "@components/PageComponents/Messages/TraceRoute.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/core";

vi.mock("@core/stores/deviceStore");

describe("TraceRoute", () => {
  const mockNodes = new Map<number, Protobuf.Mesh.NodeInfo>([
    [
      1,
      { num: 1, user: { longName: "Node A" } } as Protobuf.Mesh.NodeInfo,
    ],
    [
      2,
      { num: 2, user: { longName: "Node B" } } as Protobuf.Mesh.NodeInfo,
    ],
    [
      3,
      { num: 3, user: { longName: "Node C" } } as Protobuf.Mesh.NodeInfo,
    ],
  ]);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useDevice).mockReturnValue({
      getNode: (nodeNum: number): Protobuf.Mesh.NodeInfo | undefined => {
        return mockNodes.get(nodeNum);
      },
    });
  });

  it("renders the route to destination with SNR values", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source Node" } }}
        to={{ user: { longName: "Destination Node" } }}
        route={[1, 2]}
        snrTowards={[10, 20, 30]}
      />,
    );

    expect(screen.getAllByText("Source Node")).toHaveLength(1);
    expect(screen.getByText("Destination Node")).toBeInTheDocument();

    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getByText("Node B")).toBeInTheDocument();

    expect(screen.getAllByText(/↓/)).toHaveLength(3);
    expect(screen.getByText("↓ 10dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 20dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 30dB")).toBeInTheDocument();
  });

  it("renders the route back when provided", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source Node" } }}
        to={{ user: { longName: "Destination Node" } }}
        route={[1]}
        snrTowards={[15, 25]}
        routeBack={[3]}
        snrBack={[35, 45]}
      />,
    );

    expect(screen.getByText("Route back:")).toBeInTheDocument();

    expect(screen.getAllByText("Source Node")).toHaveLength(2);

    expect(screen.getAllByText("Destination Node")).toHaveLength(2);

    expect(screen.getByText("Node C")).toBeInTheDocument();
    expect(screen.getByText("Node A")).toBeInTheDocument();

    expect(screen.getByText("↓ 35dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 45dB")).toBeInTheDocument();

    expect(screen.getByText("↓ 15dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 25dB")).toBeInTheDocument();
  });

  it("renders '??' for missing SNR values", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source" } }}
        to={{ user: { longName: "Dest" } }}
        route={[1]}
      />,
    );

    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getAllByText("↓ ??dB")).toHaveLength(2);
  });

  it("renders hop hex if node is not found", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source" } } as unknown}
        to={{ user: { longName: "Dest" } } as unknown}
        route={[99]}
        snrTowards={[5, 15]}
      />,
    );

    expect(screen.getByText(/^!63$/)).toBeInTheDocument();
    expect(screen.getByText("↓ 5dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 15dB")).toBeInTheDocument();
  });
});
