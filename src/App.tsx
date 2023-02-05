import { MapProvider } from "react-map-gl";
import { useAppStore } from "@core/stores/appStore.js";
import { DeviceWrapper } from "@app/DeviceWrapper.js";
import { PageRouter } from "@app/PageRouter.js";
import { CommandPalette } from "@components/CommandPalette/Index.js";
import { DeviceSelector } from "@components/DeviceSelector.js";
import { DialogManager } from "@components/Dialog/DialogManager.js";
import { NewDevice } from "@components/NewDevice.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { ThemeController } from "@components/generic/ThemeController.js";
import { Menu } from "./components/Menu.js";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice, darkMode, accent } = useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <ThemeController>
      <MapProvider>
        <DeviceWrapper device={device}>
          <div className="flex min-h-screen flex-col">
            <Menu />
            <div className="flex flex-grow">
              <DeviceSelector />
              <div className="flex flex-grow flex-col">
                {device ? (
                  <div className="flex flex-grow">
                    <DialogManager />
                    <CommandPalette />
                    <PageRouter />
                  </div>
                ) : (
                  <NewDevice />
                )}
              </div>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </ThemeController>
  );
};
