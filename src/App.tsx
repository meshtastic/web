import { DeviceWrapper } from "@app/DeviceWrapper.js";
import { PageRouter } from "@app/PageRouter.js";
import { CommandPalette } from "@components/CommandPalette.js";
import { DeviceSelector } from "@components/DeviceSelector.js";
import { DialogManager } from "@components/Dialog/DialogManager.js";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.js";
import { Toaster } from "@components/Toaster.js";
import { ThemeController } from "@components/generic/ThemeController.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Dashboard } from "@pages/Dashboard/index.js";
import { MapProvider } from "react-map-gl";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <ThemeController>
      <NewDeviceDialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
        }}
      />
      <Toaster />
      <MapProvider>
        <DeviceWrapper device={device}>
          <div className="flex h-screen flex-col overflow-hidden bg-backgroundPrimary text-textPrimary">
            <div className="flex flex-grow">
              <DeviceSelector />
              <div className="flex flex-grow flex-col">
                {device ? (
                  <div className="flex h-screen">
                    <DialogManager />
                    <CommandPalette />
                    <PageRouter />
                  </div>
                ) : (
                  <Dashboard />
                )}
              </div>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </ThemeController>
  );
};
