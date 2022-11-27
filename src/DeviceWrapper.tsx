import type React from "react";

import { DeviceContext } from "@core/providers/useDevice.js";
import type { Device } from "@core/stores/deviceStore.js";

export interface DeviceWrapperProps {
  children: React.ReactNode;
  device: Device;
}

export const DeviceWrapper = ({
  children,
  device
}: DeviceWrapperProps): JSX.Element => {
  return (
    <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>
  );
};
