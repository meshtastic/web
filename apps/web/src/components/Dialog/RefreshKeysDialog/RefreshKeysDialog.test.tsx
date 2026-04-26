import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { MeshRegistry } from "@meshtastic/sdk";
import { MeshRegistryProvider } from "@meshtastic/sdk-react";
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

test("does not render dialog when there are no node errors", () => {
  const deviceId = 1;

  useDeviceStore.getState().addDevice(deviceId);

  mockUseRefreshKeysDialog.mockReturnValue({
    handleCloseDialog: vi.fn(),
    handleNodeRemove: vi.fn(),
  });

  // Empty MeshRegistry so useNodeErrors returns the empty fallback.
  const registry = new MeshRegistry();

  const { container } = render(
    <MeshRegistryProvider registry={registry}>
      <CurrentDeviceContext.Provider value={{ deviceId }}>
        <RefreshKeysDialog open onOpenChange={vi.fn()} />
      </CurrentDeviceContext.Provider>
    </MeshRegistryProvider>,
  );

  expect(container.firstChild).toBeNull();
});
