import { render, screen } from "@testing-library/react";
import { DeviceContext, useDeviceStore } from "@core/stores/deviceStore.ts";
import { RefreshKeysDialog } from "./RefreshKeysDialog.tsx";
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Protobuf } from "@meshtastic/core";

vi.mock("@core/stores/messageStore");
vi.mock("./useRefreshKeysDialog");

const mockUseMessageStore = vi.mocked(useMessageStore);
const mockUseRefreshKeysDialog = vi.mocked(useRefreshKeysDialog);

const getInitialState = () =>
  useDeviceStore.getInitialState?.() ??
    { devices: new Map(), remoteDevices: new Map() };

beforeEach(() => {
  useDeviceStore.setState(getInitialState(), true);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("renders dialog when there is a node error for the active chat", () => {
  const deviceId = 1;
  const nodeWithErrorNum = 12345;
  const activeChatNum = nodeWithErrorNum;

  const deviceStore = useDeviceStore.getState().addDevice(deviceId);

  deviceStore.addNodeInfo({
    num: nodeWithErrorNum,
    user: {
      id: nodeWithErrorNum.toString(),
      publicKey: new Uint8Array(0),
      hwModel: Protobuf.Mesh.HardwareModel.HELTEC_V3,
      longName: "Problem Node Long",
      shortName: "ProbNode",
      isLicensed: false,
      macaddr: new Uint8Array(0),
    },
    lastHeard: Date.now() / 1000,
    snr: 10,
  } as Protobuf.Mesh.NodeInfo);

  deviceStore.setNodeError(activeChatNum, "PKI_MISMATCH");

  const updatedDeviceState = useDeviceStore.getState().getDevice(deviceId);
  if (!updatedDeviceState) {
    throw new Error(
      "Failed to get updated device state from store for provider",
    );
  }

  mockUseMessageStore.mockReturnValue({ activeChat: activeChatNum });
  const mockHandleClose = vi.fn();
  const mockHandleRemove = vi.fn();
  mockUseRefreshKeysDialog.mockReturnValue({
    handleCloseDialog: mockHandleClose,
    handleNodeRemove: mockHandleRemove,
  });

  render(
    <DeviceContext.Provider value={updatedDeviceState}>
      <RefreshKeysDialog open onOpenChange={vi.fn()} />
    </DeviceContext.Provider>,
  );

  expect(screen.getByText(/Keys Mismatch - Problem Node Long/))
    .toBeInTheDocument();
  expect(
    screen.getByText(
      /Your node is unable to send a direct message to node: Problem Node Long \(ProbNode\)/,
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Request New Keys" }))
    .toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
});

test("does not render dialog if no error exists for active chat", () => {
  const deviceId = 1;
  const activeChatNum = 54321;

  useDeviceStore.getState().addDevice(deviceId);

  const currentDeviceState = useDeviceStore.getState().getDevice(deviceId);
  if (!currentDeviceState) throw new Error("Device not found");

  mockUseMessageStore.mockReturnValue({ activeChat: activeChatNum });
  mockUseRefreshKeysDialog.mockReturnValue({
    handleCloseDialog: vi.fn(),
    handleNodeRemove: vi.fn(),
  });

  const { container } = render(
    <DeviceContext.Provider value={currentDeviceState}>
      <RefreshKeysDialog open onOpenChange={vi.fn()} />
    </DeviceContext.Provider>,
  );

  expect(container.firstChild).toBeNull();
});
