import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { PageRouter } from "@app/PageRouter.tsx";
import { ThemeProvider } from "@app/components/generic/ThemeProvider";
import { CommandPalette } from "@components/CommandPalette.tsx";
import { DeviceSelector } from "@components/DeviceSelector.tsx";
import { DialogManager } from "@components/Dialog/DialogManager";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder";
import { Toaster } from "@components/Toaster.tsx";
import Footer from "@components/UI/Footer.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import type { JSX } from "react";
import { MapProvider } from "react-map-gl";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();

  const device = getDevice(selectedDevice);

  return (
    <>
      <NewDeviceDialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
        }}
      />
      <Toaster />
      <MapProvider>
        <DeviceWrapper device={device}>
          <div className="flex h-screen flex-col overflow-hidden bg-background-primary text-text-primary">
            <div className="flex grow">
              <DeviceSelector />
              <div className="flex grow flex-col">
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
                    <Footer />
                  </>
                )}
              </div>
            </div>
          </div>
        </DeviceWrapper>
      </MapProvider>
    </>
  );
};
