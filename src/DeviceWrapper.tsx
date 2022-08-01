import type React from "react";

import { Device, DeviceContext } from "./core/stores/deviceStore.js";

export interface DeviceProps {
  children: React.ReactNode;
  device: Device;
}

export const DeviceWrapper = ({
  children,
  device,
}: DeviceProps): JSX.Element => {
  return (
    <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>
  );
};
