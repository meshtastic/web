import { useRemoteSettings } from "@core/settings/remoteContext.ts";
import { useDevice } from "@core/stores";

/**
 * The connected radio is in managed mode: it drops admin messages from
 * this app, so actions that change it can't work. Reads the local radio
 * even while another node's settings are open.
 */
export const useLocalRadioManaged = (): boolean => {
  const device = useDevice();
  const local = useRemoteSettings()?.local ?? device;
  return local.config?.security?.isManaged === true;
};
