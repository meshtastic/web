import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { TraceRoute } from "@components/PageComponents/Messages/TraceRoute.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";

vi.mock("@core/stores/deviceStore");

describe("TraceRoute", () => {
  const mockNodes = new Map([
    [
      1,
      { num: 1, user: { longName: "Node A" } },
    ],
    [
      2,
      { num: 2, user: { longName: "Node B" } },
    ],
    [
      3,
      { num: 3, user: { longName: "Node C" } },
    ],
  ]);

  beforeEach(() => {
    vi.resetAllMocks();
    (useDevice as Mock).mockReturnValue({
      nodes: mockNodes,
    });
  });

  it("renders the route to destination with SNR values", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source Node" } } as any}
        to={{ user: { longName: "Destination Node" } } as any}
        route={[1, 2]}
        snrTowards={[10, 20, 30]}
      />
    );

    expect(screen.getByText("Route to destination:")).toBeInTheDocument();
    expect(screen.getByText("Destination Node")).toBeInTheDocument();

    expect(screen.getByText("Node A")).toBeInTheDocument();
    expect(screen.getByText("Node B")).toBeInTheDocument();

    expect(screen.getAllByText(/↓/)).toHaveLength(3); // startNode + 2 hops
    expect(screen.getByText("↓ 10dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 20dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 30dB")).toBeInTheDocument();
    expect(screen.getByText("Source Node")).toBeInTheDocument();
  });

  it("renders the route back when provided", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source Node" } } as any}
        to={{ user: { longName: "Destination Node" } } as any}
        route={[1]}
        snrTowards={[15, 25]}
        routeBack={[3]}
        snrBack={[35, 45]}
      />
    );

    expect(screen.getByText("Route back:")).toBeInTheDocument();
    expect(screen.getByText("Node C")).toBeInTheDocument();
    expect(screen.getByText("↓ 35dB")).toBeInTheDocument();
    expect(screen.getByText("↓ 45dB")).toBeInTheDocument();
  });

  it("renders '??' for missing SNR values", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source" } } as any}
        to={{ user: { longName: "Dest" } } as any}
        route={[1]}
      />
    );

    expect(screen.getAllByText("↓ ??dB").length).toBeGreaterThan(0);
  });

  it("renders hop hex if node is not found", () => {
    render(
      <TraceRoute
        from={{ user: { longName: "Source" } } as any}
        to={{ user: { longName: "Dest" } } as any}
        route={[99]}
      />
    );

    expect(screen.getByText(/^!63$/)).toBeInTheDocument(); // 99 in hex 
  });
});
