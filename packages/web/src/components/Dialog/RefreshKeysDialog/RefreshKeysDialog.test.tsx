import {
  CurrentDeviceContext,
  useDeviceStore,
  useMessageStore,
} from "@core/stores";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RefreshKeysDialog } from "./RefreshKeysDialog.tsx";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";

vi.mock("@core/stores", async () => {
  const actual = (await vi.importActual(
    "@core/stores",
  )) as typeof import("@core/stores");
  return {
    ...actual,
    useMessageStore: vi.fn(),
  };
});
vi.mock("./useRefreshKeysDialog");

const mockUseMessageStore = vi.mocked(useMessageStore);
const mockUseRefreshKeysDialog = vi.mocked(useRefreshKeysDialog);

const getInitialState = () =>
  useDeviceStore.getInitialState?.() ?? {
    devices: new Map(),
    remoteDevices: new Map(),
  };

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

  mockUseMessageStore.mockReturnValue({ activeChat: activeChatNum });
  mockUseRefreshKeysDialog.mockReturnValue({
    handleCloseDialog: vi.fn(),
    handleNodeRemove: vi.fn(),
  });

  const { container } = render(
    <CurrentDeviceContext.Provider value={{ deviceId }}>
      <RefreshKeysDialog open onOpenChange={vi.fn()} />
    </CurrentDeviceContext.Provider>,
  );

  expect(container.firstChild).toBeNull();
});
