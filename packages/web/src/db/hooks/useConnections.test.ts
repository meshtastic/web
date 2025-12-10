import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useConnections, useConnection, useDefaultConnection } from "./useConnections";
import { connectionRepo } from "../repositories";
import { useDeviceStore, useAppStore } from "@core/stores";

// Mock Repositories
vi.mock("../repositories", () => ({
  connectionRepo: {
    getConnections: vi.fn(),
    createConnection: vi.fn(),
    updateStatus: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn(),
    setDefault: vi.fn(),
    getConnection: vi.fn(),
    getDefaultConnection: vi.fn(),
    linkMeshDevice: vi.fn(),
  },
}));

// Mock Stores
const mockSetActiveConnectionId = vi.fn();
const mockAddDevice = vi.fn();
const mockSetSelectedDevice = vi.fn();

vi.mock("@core/stores", () => ({
  useDeviceStore: Object.assign(
    vi.fn((selector) => {
        if (selector) return selector({ setActiveConnectionId: mockSetActiveConnectionId, addDevice: mockAddDevice });
        return { setActiveConnectionId: mockSetActiveConnectionId, addDevice: mockAddDevice };
    }),
    { getState: vi.fn() }
  ),
  useAppStore: Object.assign(
    vi.fn((selector) => {
        if (selector) return selector({ selectedDeviceId: 123 });
        return { setSelectedDevice: mockSetSelectedDevice, selectedDeviceId: 123 };
    }),
    { getState: vi.fn() }
  ),
}));

// Mock other dependencies
vi.mock("@meshtastic/transport-http", () => ({ TransportHTTP: { create: vi.fn() } }));
vi.mock("@meshtastic/transport-web-bluetooth", () => ({ TransportWebBluetooth: { createFromDevice: vi.fn() } }));
vi.mock("@meshtastic/transport-web-serial", () => ({ TransportWebSerial: { createFromPort: vi.fn() } }));
vi.mock("@meshtastic/core", () => ({ MeshDevice: vi.fn(), Types: { DeviceStatusEnum: {} } }));
vi.mock("@app/pages/Connections/utils", () => ({ testHttpReachable: vi.fn() }));
vi.mock("@app/routes", () => ({ router: { navigate: vi.fn() } }));
vi.mock("../subscriptionService", () => ({ SubscriptionService: { subscribeToDevice: vi.fn() } }));

describe("useConnections", () => {
  const mockConnections = [
    { id: 1, type: "http", name: "HTTP 1", url: "http://test.com", status: "disconnected" },
    { id: 2, type: "bluetooth", name: "BT 1", deviceId: "bt-123", status: "disconnected" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default store mocks
    (useDeviceStore as unknown as vi.Mock).mockImplementation((selector: any) => {
        if (selector) return selector({ setActiveConnectionId: mockSetActiveConnectionId, addDevice: mockAddDevice });
        return { setActiveConnectionId: mockSetActiveConnectionId, addDevice: mockAddDevice };
    });
    (useDeviceStore as any).getState.mockReturnValue({
        getDevice: vi.fn(),
        removeDevice: vi.fn(),
    });

    (useAppStore as unknown as vi.Mock).mockImplementation((selector: any) => {
        if (selector) return selector({ selectedDeviceId: null });
        return { setSelectedDevice: mockSetSelectedDevice, selectedDeviceId: null };
    });

    // Default repo mock
    (connectionRepo.getConnections as vi.Mock).mockResolvedValue(mockConnections);
  });

  it("should initialize and fetch connections", async () => {
    const { result } = renderHook(() => useConnections());

    await waitFor(() => {
      expect(result.current.connections).toEqual(mockConnections);
    });
    expect(connectionRepo.getConnections).toHaveBeenCalled();
  });

  it("should add a new connection", async () => {
    const newConnInput = { type: "http" as const, name: "New HTTP", url: "http://new.com" };
    const createdConn = { id: 3, ...newConnInput, status: "disconnected" };
    
    (connectionRepo.createConnection as vi.Mock).mockResolvedValue(createdConn);
    (connectionRepo.getConnections as vi.Mock)
      .mockResolvedValueOnce(mockConnections) // Initial load
      .mockResolvedValueOnce([...mockConnections, createdConn]); // After add

    const { result } = renderHook(() => useConnections());
    await waitFor(() => expect(result.current.connections).toHaveLength(2));

    await act(async () => {
      await result.current.addConnection(newConnInput);
    });

    await waitFor(() => {
      expect(result.current.connections).toHaveLength(3);
    });
    expect(connectionRepo.createConnection).toHaveBeenCalledWith(expect.objectContaining({
        type: "http",
        name: "New HTTP",
        url: "http://new.com",
        status: "disconnected"
    }));
  });

  it("should remove a connection", async () => {
    (connectionRepo.deleteConnection as vi.Mock).mockResolvedValue(undefined);
    (connectionRepo.getConnections as vi.Mock)
        .mockResolvedValueOnce(mockConnections)
        .mockResolvedValueOnce([mockConnections[1]]); // After delete

    const { result } = renderHook(() => useConnections());
    await waitFor(() => expect(result.current.connections).toHaveLength(2));

    await act(async () => {
      await result.current.removeConnection(1);
    });

    await waitFor(() => {
      expect(result.current.connections).toHaveLength(1);
    });
    expect(connectionRepo.deleteConnection).toHaveBeenCalledWith(1);
  });

  it("should set default connection", async () => {
    (connectionRepo.setDefault as vi.Mock).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useConnections());
    await waitFor(() => expect(result.current.connections).toHaveLength(2));

    await act(async () => {
      await result.current.setDefaultConnection(1);
    });

    expect(connectionRepo.setDefault).toHaveBeenCalledWith(1, true); // Assuming initial isDefault was undefined/false
    expect(connectionRepo.getConnections).toHaveBeenCalledTimes(2); // Initial + after setDefault
  });
});

describe("useConnection", () => {
  const mockConnection = { id: 1, type: "http", name: "HTTP 1", url: "http://test.com", status: "disconnected" };

  beforeEach(() => {
    vi.clearAllMocks();
    (connectionRepo.getConnection as vi.Mock).mockResolvedValue(mockConnection);
  });

  it("should fetch a specific connection", async () => {
    const { result } = renderHook(() => useConnection(1));

    await waitFor(() => {
      expect(result.current.connection).toEqual(mockConnection);
    });
    expect(connectionRepo.getConnection).toHaveBeenCalledWith(1);
  });
});

describe("useDefaultConnection", () => {
  const mockConnection = { id: 1, type: "http", name: "Default", url: "http://default.com", status: "disconnected", isDefault: true };

  beforeEach(() => {
    vi.clearAllMocks();
    (connectionRepo.getDefaultConnection as vi.Mock).mockResolvedValue(mockConnection);
  });

  it("should fetch the default connection", async () => {
    const { result } = renderHook(() => useDefaultConnection());

    await waitFor(() => {
      expect(result.current.connection).toEqual(mockConnection);
    });
    expect(connectionRepo.getDefaultConnection).toHaveBeenCalled();
  });
});
