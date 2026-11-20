import { editorFor } from "@core/kmp/configEditorIo.ts";
import { FakeKmpClient } from "@core/kmp/fakeClient.ts";
import { MeshRegistryProvider } from "@core/kmp/hooks";
import { MeshRegistry } from "@core/kmp/registry.ts";
import { MeshSession } from "@core/kmp/session.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { CurrentDeviceContext, useDeviceStore } from "@core/stores";
import { cleanup, render } from "@testing-library/react";
import { type ReactElement, Suspense } from "react";
import { afterEach } from "vitest";
import { interceptAdmin } from "./adminInterceptor.ts";

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
  const kmp = new FakeKmpClient();
  const registry = new MeshRegistry();
  const client = new MeshSession(kmp);
  const id = nextDeviceId++;
  registry.register(id, client);
  registry.setActive(id);
  const radio = interceptAdmin(kmp);
  const editor = editorFor(client);

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
    client.close();
    useDeviceStore.getState().removeDevice(id);
  });

  render(
    <CurrentDeviceContext.Provider value={{ deviceId: id }}>
      <MeshRegistryProvider registry={registry}>
        <Suspense fallback={<div>loading</div>}>{ui}</Suspense>
      </MeshRegistryProvider>
    </CurrentDeviceContext.Provider>,
  );

  return { client, editor, radio };
}
