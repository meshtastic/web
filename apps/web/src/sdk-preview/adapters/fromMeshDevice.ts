import type { MeshDevice } from "@meshtastic/core";
import type { MeshClientPort } from "../core/index.ts";
import { ConfigEditor } from "../features/config/index.ts";

/**
 * Adapts the legacy `@meshtastic/core` `MeshDevice` to the slice's
 * `MeshClientPort`.
 *
 * In the real SDK (PR #1050) the client owns explicit begin/commit admin
 * messages. The legacy `MeshDevice.setConfig` already opens the edit
 * transaction itself (guarded by its `pendingSettingsChanges` flag) and
 * `commitEditSettings()` closes it — so `beginEditSettings` here is a no-op and
 * the transaction is driven by the existing device methods.
 */
export function meshDeviceToPort(device: MeshDevice): MeshClientPort {
  return {
    events: {
      onConfigPacket: device.events.onConfigPacket,
      onModuleConfigPacket: device.events.onModuleConfigPacket,
      onDeviceStatus: device.events.onDeviceStatus,
    },
    setConfig: (config) => device.setConfig(config),
    setModuleConfig: (moduleConfig) => device.setModuleConfig(moduleConfig),
    beginEditSettings: () => Promise.resolve(0),
    commitEditSettings: () => device.commitEditSettings(),
  };
}

const editors = new WeakMap<MeshDevice, ConfigEditor>();

/**
 * Returns the `ConfigEditor` for a device connection, creating it lazily and
 * caching one per connection (so every consumer binds to the same signals).
 */
export function getConfigEditor(device: MeshDevice): ConfigEditor {
  let editor = editors.get(device);
  if (!editor) {
    editor = new ConfigEditor(meshDeviceToPort(device));
    editors.set(device, editor);
  }
  return editor;
}
