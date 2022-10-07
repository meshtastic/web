import type React from "react";

import { Toaster } from "react-hot-toast";
import { MapProvider } from "react-map-gl";

import { useAppStore } from "@app/core/stores/appStore.js";
import { DeviceWrapper } from "@app/DeviceWrapper.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";

import { DeviceSelector } from "./components/DeviceSelector.js";
import { NewDevice } from "./components/NewDevice.js";
import { PageNav } from "./components/PageNav.js";
import { Sidebar } from "./components/Sidebar.js";
import { PageRouter } from "./PageRouter.js";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice } = useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <div className="flex h-screen w-full">
      <DeviceSelector />

      {device && (
        <DeviceWrapper device={device}>
          <Toaster
            toastOptions={{
              duration: 2000,
            }}
          />
          <Sidebar />
          <PageNav />
          <MapProvider>
            <PageRouter />
          </MapProvider>
        </DeviceWrapper>
      )}
      {selectedDevice === 0 && <NewDevice />}
    </div>
  );
};
