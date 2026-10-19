import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { MeshClient, MeshRegistry, type Protobuf } from "@meshtastic/sdk";
import {
  createFakeTransport,
  interceptAdminMessages,
} from "@meshtastic/sdk/testing";
import { MeshRegistryProvider } from "@meshtastic/sdk-react";
import { cleanup, render } from "@testing-library/react";
import { type ReactElement, Suspense } from "react";
import { afterEach } from "vitest";

let nextDeviceId = 1000;
const teardowns: (() => void)[] = [];

afterEach(() => {
  // Unmount before removing the device the form reads from.
  cleanup();
  for (const teardown of teardowns.splice(0)) teardown();
});

/**
 * Render a settings form against a connected fake radio, with `device` as the
 * config it has reported. Torn down after each test.
 */
export function renderSettingsForm(
  ui: ReactElement,
  device: {
    config?: Protobuf.Config.Config[];
    moduleConfig?: Protobuf.ModuleConfig.ModuleConfig[];
  },
) {
  const { transport } = createFakeTransport();
  const registry = new MeshRegistry();
  const client = new MeshClient({ transport });
  const id = nextDeviceId++;
  registry.register(id, client);
  registry.setActive(id);
  const radio = interceptAdminMessages(client);

  const stored = useDeviceStore.getState().addDevice(id);
  for (const config of device.config ?? []) {
    stored.setConfig(config);
    client.events.onConfigPacket.dispatch(config);
  }
  for (const moduleConfig of device.moduleConfig ?? []) {
    stored.setModuleConfig(moduleConfig);
    client.events.onModuleConfigPacket.dispatch(moduleConfig);
  }

  teardowns.push(() => {
    registry.unregister(id);
    useDeviceStore.getState().removeDevice(id);
  });

  render(
    <CurrentDeviceContext.Provider value={{ deviceId: id }}>
      <MeshRegistryProvider registry={registry}>
        <Suspense fallback={<div>loading</div>}>{ui}</Suspense>
      </MeshRegistryProvider>
    </CurrentDeviceContext.Provider>,
  );

  return { client, editor: client.config.editor, radio };
}
