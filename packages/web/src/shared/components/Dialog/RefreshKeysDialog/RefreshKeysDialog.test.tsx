import { useDeviceStore } from "@state/index.ts";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RefreshKeysDialog } from "./RefreshKeysDialog.tsx";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";

vi.mock("./useRefreshKeysDialog");

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

  useDeviceStore.getState().addDevice(deviceId);
  useDeviceStore.setState({ activeDeviceId: deviceId });

  mockUseRefreshKeysDialog.mockReturnValue({
    handleCloseDialog: vi.fn(),
    handleNodeRemove: vi.fn(),
  });

  const { container } = render(
    <RefreshKeysDialog open onOpenChange={vi.fn()} />,
  );

  expect(container.firstChild).toBeNull();
});
