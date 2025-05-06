import { render } from "@testing-library/react";
import { DeviceContext, useDeviceStore } from "@core/stores/deviceStore.ts";
import { RefreshKeysDialog } from "./RefreshKeysDialog.tsx";
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

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
