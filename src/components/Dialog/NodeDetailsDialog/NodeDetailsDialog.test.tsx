import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NodeDetailsDialog } from "@components/Dialog/NodeDetailsDialog/NodeDetailsDialog.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useAppStore } from "@core/stores/appStore.ts";
import { Protobuf } from "@meshtastic/core";

vi.mock("@core/stores/deviceStore");
vi.mock("@core/stores/appStore");

const mockUseDevice = vi.mocked(useDevice);
const mockUseAppStore = vi.mocked(useAppStore);

describe("NodeDetailsDialog", () => {
  const mockDevice = {
    num: 1234,
    user: {
      longName: "Test Node",
      shortName: "TN",
      hwModel: 1,
      role: 1,
    },
    lastHeard: 1697500000,
    position: {
      latitudeI: 450000000,
      longitudeI: -750000000,
      altitude: 200,
    },
    deviceMetrics: {
      airUtilTx: 50.123,
      channelUtilization: 75.456,
      batteryLevel: 88.789,
      voltage: 4.2,
      uptimeSeconds: 3600,
    },
  } as unknown as Protobuf.Mesh.NodeInfo;

  beforeEach(() => {
    vi.resetAllMocks();

    mockUseDevice.mockReturnValue({
      getNode: (nodeNum: number) => {
        if (nodeNum === 1234) {
          return mockDevice;
        }
        return undefined;
      },
    });

    mockUseAppStore.mockReturnValue({
      nodeNumDetails: 1234,
    });
  });

  it("renders node details correctly", () => {
    render(<NodeDetailsDialog open onOpenChange={() => {}} />);

    expect(screen.getByText(/Node Details for Test Node \(TN\)/i))
      .toBeInTheDocument();

    expect(screen.getByText("Node Number: 1234")).toBeInTheDocument();
    expect(screen.getByText(/Node Hex: !/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Heard:/i)).toBeInTheDocument();

    expect(screen.getByText(/Coordinates:/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /^45, -75$/ });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("openstreetmap.org"),
    );
    expect(screen.getByText(/Altitude: 200m/i)).toBeInTheDocument();

    expect(screen.getByText(/Air TX utilization: 50.12%/i)).toBeInTheDocument();
    expect(screen.getByText(/Channel utilization: 75.46%/i))
      .toBeInTheDocument();
    expect(screen.getByText(/Battery level: 88.79%/i)).toBeInTheDocument();
    expect(screen.getByText(/Voltage: 4.20V/i)).toBeInTheDocument();
    expect(screen.getByText(/Uptime:/i)).toBeInTheDocument();

    expect(screen.getByText(/All Raw Metrics:/i)).toBeInTheDocument();
  });

  it("renders null if device is not found", () => {
    const requestedNodeNum = 5678;

    mockUseAppStore.mockReturnValue({
      nodeNumDetails: requestedNodeNum,
    });

    mockUseDevice.mockReturnValue({
      getNode: (nodeNum: number) => {
        if (nodeNum === requestedNodeNum) {
          return undefined;
        }
        if (nodeNum === 1234) {
          return mockDevice;
        }
        return undefined;
      },
    });

    const { container } = render(
      <NodeDetailsDialog open onOpenChange={() => {}} />,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Node Details for/i)).not.toBeInTheDocument();
  });

  it("renders correctly when position is missing", () => {
    const nodeWithoutPosition = { ...mockDevice, position: undefined };
    mockUseDevice.mockReturnValue({ getNode: () => nodeWithoutPosition });
    mockUseAppStore.mockReturnValue({ nodeNumDetails: 1234 });

    render(<NodeDetailsDialog open onOpenChange={() => {}} />);

    expect(screen.queryByText(/Coordinates:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Altitude:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Node Details for Test Node/i)).toBeInTheDocument();
  });

  it("renders correctly when deviceMetrics are missing", () => {
    const nodeWithoutMetrics = { ...mockDevice, deviceMetrics: undefined };
    mockUseDevice.mockReturnValue({ getNode: () => nodeWithoutMetrics });
    mockUseAppStore.mockReturnValue({ nodeNumDetails: 1234 });

    render(<NodeDetailsDialog open onOpenChange={() => {}} />);

    expect(screen.queryByText(/Device Metrics:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Air TX utilization:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Node Details for Test Node/i)).toBeInTheDocument();
  });

  it("renders 'Never' for lastHeard when timestamp is 0", () => {
    const nodeNeverHeard = { ...mockDevice, lastHeard: 0 };
    mockUseDevice.mockReturnValue({ getNode: () => nodeNeverHeard });
    mockUseAppStore.mockReturnValue({ nodeNumDetails: 1234 });

    render(<NodeDetailsDialog open onOpenChange={() => {}} />);

    expect(screen.getByText(/Last Heard: Never/i)).toBeInTheDocument();
  });
});
