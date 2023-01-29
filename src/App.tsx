import { MapProvider } from "react-map-gl";
import { useAppStore } from "@core/stores/appStore.js";
import { DeviceWrapper } from "@app/DeviceWrapper.js";
import { PageRouter } from "@app/PageRouter.js";
import { CommandPalette } from "@components/CommandPalette/Index.js";
import { DeviceSelector } from "@components/DeviceSelector.js";
import { DialogManager } from "@components/Dialog/DialogManager.js";
import { NewDevice } from "@components/NewDevice.js";
import { Sidebar } from "@components/Sidebar.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";

import { Drawer } from "@components/Drawer/index.js";
import { ThemeController } from "@components/generic/ThemeController.js";
import { BottomNav } from "@app/Nav/BottomNav.js";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice, darkMode, accent } = useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <ThemeController>
      <MapProvider>
        <DeviceWrapper device={device}>
          <div className="flex bg-backgroundSecondary">
            <DeviceSelector />
            <div className="flex flex-grow flex-col">
              {device ? (
                <div className="flex flex-grow">
                  <DialogManager />
                  <CommandPalette />
                  <Sidebar />
                  <PageRouter />
                </div>
              ) : (
                <NewDevice />
              )}
              <BottomNav>{device && <Drawer />}</BottomNav>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </ThemeController>
  );
};
