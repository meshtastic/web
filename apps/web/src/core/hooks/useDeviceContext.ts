import { createContext, useContext } from "react";

export type DeviceContext = {
  deviceId: number; // Unique identifier for the device, not nodeNum
};

export const CurrentDeviceContext = createContext<DeviceContext | undefined>(
  undefined,
);

export function useDeviceContext(): DeviceContext {
  const ctx = useContext(CurrentDeviceContext);
  if (!ctx) {
    throw new Error(
      "useDeviceContext must be used within CurrentDeviceContext provider",
    );
  }
  return ctx;
}
