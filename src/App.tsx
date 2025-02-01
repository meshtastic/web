import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { PageRouter } from "@app/PageRouter.tsx";
import { CommandPalette } from "@components/CommandPalette.tsx";
import { DeviceSelector } from "@components/DeviceSelector.tsx";
import { DialogManager } from "@components/Dialog/DialogManager";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder";
import { Toaster } from "@components/Toaster.tsx";
import Footer from "@components/UI/Footer.tsx";
import { ThemeController } from "@components/generic/ThemeController.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { Dashboard } from "@pages/Dashboard/index.tsx";
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
                    <KeyBackupReminder />
                    <CommandPalette />
                    <PageRouter />
                  </div>
                ) : (
                  <>
                    <Dashboard />
                    <div className="flex flex-grow" />
                    <Footer />
                  </>
                )}
              </div>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </ThemeController>
  );
};
