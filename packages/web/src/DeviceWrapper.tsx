import { type Device, DeviceContext } from "@core/stores";
import type { ReactNode } from "react";

export interface DeviceWrapperProps {
  children: ReactNode;
  device?: Device;
}

export const DeviceWrapper = ({ children, device }: DeviceWrapperProps) => {
  return (
    <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>
  );
};
