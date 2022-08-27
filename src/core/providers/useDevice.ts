import { createContext, useContext } from "react";

import type { Device } from "@core/stores/deviceStore.js";

export const DeviceContext = createContext<Device | undefined>(undefined);

export const useDevice = (): Device => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error("useDevice must be used within a ConnectionProvider");
  }
  return context;
};
