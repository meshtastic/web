import { CurrentDeviceContext } from "@core/stores";
import type { ReactNode } from "react";

export interface DeviceWrapperProps {
  children: ReactNode;
  deviceId: number;
}

export const DeviceWrapper = ({ children, deviceId }: DeviceWrapperProps) => {
  return (
    <CurrentDeviceContext.Provider value={{ deviceId }}>
      {children}
    </CurrentDeviceContext.Provider>
  );
};
