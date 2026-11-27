import type { Device } from "@core/stores/deviceStore/index.ts";
import { createContext, useContext } from "react";
import type { RemoteSettings } from "./remoteSettings.ts";

/**
 * Settings opened for another node. Inside it, the settings hooks
 * (`useConfigEditor`, `useDevice`, `useDeviceCapabilities`,
 * `useMyNodeAsProto`, `useWaitForConfig`) read that node instead of the
 * local radio.
 */
export interface RemoteSettingsScope {
  readonly remote: RemoteSettings;
  /** The local device record, with config read from the remote node. */
  readonly device: Device;
  /** The local device record itself, for the app's own chrome. */
  readonly local: Device;
  /** The node's name, as this radio knows it. */
  readonly name: string;
}

export const RemoteSettingsContext = createContext<
  RemoteSettingsScope | undefined
>(undefined);

/** The remote node being managed, or `undefined` for local settings. */
export const useRemoteSettings = (): RemoteSettingsScope | undefined =>
  useContext(RemoteSettingsContext);
