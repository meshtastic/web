import { TraceRoute } from "@components/PageComponents/Messages/TraceRoute.tsx";
import { useNodeDB } from "@core/stores";
import { mockNodeDBStore } from "@core/stores/nodeDBStore/nodeDBStore.mock.ts";
import { Protobuf } from "@meshtastic/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@core/stores");

describe("TraceRoute", () => {
  const fromUser = {
    user: {
      $typeName: "meshtastic.User",
      longName: "Source Node",
      publicKey: new Uint8Array([1, 2, 3]),
      shortName: "Source",
      hwModel: 1,
      macaddr: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
      id: "source-node",
      isLicensed: false,
      role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
    } as Protobuf.Mesh.NodeInfo["user"],
  };

  const toUser = {
    user: {
      $typeName: "meshtastic.User",
      longName: "Destination Node",
      publicKey: new Uint8Array([4, 5, 6]),
      shortName: "Destination",
      hwModel: 2,
      macaddr: new Uint8Array([0x05, 0x06, 0x07, 0x08]),
      id: "destination-node",
      isLicensed: false,
      role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
    } as Protobuf.Mesh.NodeInfo["user"],
  };

  const mockNodes = new Map<number, Protobuf.Mesh.NodeInfo>([
    [
      1,
      {
        num: 1,
        user: { longName: "Node A", $typeName: "meshtastic.User" },
        $typeName: "meshtastic.NodeInfo",
      } as Protobuf.Mesh.NodeInfo,
    ],
    [
      2,
      {
        num: 2,
        user: { longName: "Node B", $typeName: "meshtastic.User" },
        $typeName: "meshtastic.NodeInfo",
      } as Protobuf.Mesh.NodeInfo,
    ],
    [
      3,
      {
        num: 3,
        user: { longName: "Node C", $typeName: "meshtastic.User" },
        $typeName: "meshtastic.NodeInfo",
      } as Protobuf.Mesh.NodeInfo,
    ],
  ]);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useNodeDB).mockReturnValue({
      ...mockNodeDBStore,
      getNode: (nodeNum: number): Protobuf.Mesh.NodeInfo | undefined => {
        return mockNodes.get(nodeNum);
      },
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
