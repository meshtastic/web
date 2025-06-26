import { DeviceContext } from "@core/stores/deviceStore.ts";
import type { Device } from "@core/stores/deviceStore.ts";
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
