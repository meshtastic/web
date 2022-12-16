import type React from "react";

import { Toaster } from "react-hot-toast";
import { MapProvider } from "react-map-gl";

import { useAppStore } from "@app/core/stores/appStore.js";
import { DeviceWrapper } from "@app/DeviceWrapper.js";
import { PageRouter } from "@app/PageRouter.js";
import { CommandPalette } from "@components/CommandPalette/Index.js";
import { DeviceSelector } from "@components/DeviceSelector.js";
import { DialogManager } from "@components/Dialog/DialogManager.js";
import { Drawer } from "@components/Drawer/index.js";
import { NewDevice } from "@components/NewDevice.js";
import { PageNav } from "@components/PageNav.js";
import { Sidebar } from "@components/Sidebar.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { ThemeController } from "./components/generic/ThemeController.js";
import { SetupPage } from "./components/SetupPage.js";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice, darkMode, accent } = useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <ThemeController>
      <div className="flex h-screen w-full bg-backgroundSecondary">
        <DeviceSelector />

        {device && (
          <DeviceWrapper device={device}>
            <CommandPalette />
            <Toaster
              toastOptions={{
                duration: 4000
              }}
            />
            <DialogManager />
            <Sidebar />
            <PageNav />
            <MapProvider>
              <div className="flex h-full w-full flex-col overflow-y-auto">
                <PageRouter />
                <Drawer />
              </div>
            </MapProvider>
          </DeviceWrapper>
        )}        
        {selectedDevice === -1 && <SetupPage/>}
        {selectedDevice === 0 && <NewDevice />}
      </div>
    </ThemeController>
  );
};
