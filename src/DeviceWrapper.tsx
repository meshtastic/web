import { DeviceContext } from "@core/stores/deviceStore.js";
import type { Device } from "@core/stores/deviceStore.js";
import type { ReactNode } from "react";

export interface DeviceWrapperProps {
  children: ReactNode;
  device?: Device;
}

export const DeviceWrapper = ({
  children,
  device,
}: DeviceWrapperProps): JSX.Element => {
  return (
    <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>
  );
};
