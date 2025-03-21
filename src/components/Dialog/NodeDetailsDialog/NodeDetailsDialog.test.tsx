import { describe, it, vi, expect, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { NodeDetailsDialog } from "@components/Dialog/NodeDetailsDialog/NodeDetailsDialog.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useAppStore } from "@core/stores/appStore.ts";

vi.mock("@core/stores/deviceStore");
vi.mock("@core/stores/appStore");

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
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    (useDevice as Mock).mockReturnValue({
      nodes: new Map([[1234, mockDevice]]),
    });

    (useAppStore as unknown as Mock).mockReturnValue({
      nodeNumDetails: 1234,
    });
  });

  it("renders node details correctly", () => {
    render(<NodeDetailsDialog open={true} onOpenChange={() => { }} />);

    expect(screen.getByText(/Node Details for Test Node/i)).toBeInTheDocument();

    expect(screen.getByText("Node Number: 1234")).toBeInTheDocument();

    expect(screen.getByText(/Air TX utilization: 50.12%/i)).toBeInTheDocument();
    expect(screen.getByText(/Channel utilization: 75.46%/i)).toBeInTheDocument();
    expect(screen.getByText(/Battery level: 88.79%/i)).toBeInTheDocument();
    expect(screen.getByText(/Voltage: 4.20V/i)).toBeInTheDocument();
    expect(screen.getByText(/Uptime:/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinates:/i)).toBeInTheDocument();
    expect(screen.getByText("45, -75")).toBeInTheDocument();
    expect(screen.getByText(/Altitude: 200m/i)).toBeInTheDocument();
    expect(screen.getByText(/Role:/i)).toBeInTheDocument();
  });

  it("renders null if device is not found", () => {
    (useDevice as Mock).mockReturnValue({
      nodes: new Map(),
    });

    render(<NodeDetailsDialog open={true} onOpenChange={() => { }} />);
    expect(screen.queryByText(/Node Details for/i)).not.toBeInTheDocument();
  });
});
