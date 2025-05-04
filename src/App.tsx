import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { PageRouter } from "@app/PageRouter.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import Footer from "@components/UI/Footer.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import type { JSX } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import { MapProvider } from "react-map-gl/maplibre";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { SidebarProvider } from "@core/stores/sidebarStore.tsx";
import { useTheme } from "@core/hooks/useTheme.ts";

export const App = (): JSX.Element => {
  const { getDevice } = useDeviceStore();
  const { selectedDevice, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();

  const device = getDevice(selectedDevice);

  // Sets up light/dark mode based on user preferences or system settings
  useTheme();

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <NewDeviceDialog
        open={connectDialogOpen}
        onOpenChange={(open) => {
          setConnectDialogOpen(open);
        }}
      />
      <Toaster />
      <DeviceWrapper device={device}>
        <div
          className="flex h-screen flex-col bg-background-primary text-text-primary"
          style={{ scrollbarWidth: "thin" }}
        >
          <SidebarProvider>
            <div className="h-full flex flex-col">
              {device
                ? (
                  <div className="h-full flex w-full">
                    <DialogManager />
                    <KeyBackupReminder />
                    <CommandPalette />
                    <MapProvider>
                      <PageRouter />
                    </MapProvider>
                  </div>
                )
                : (
                  <>
                    <Dashboard />
                    <Footer />
                  </>
                )}
            </div>
          </SidebarProvider>
        </div>
      </DeviceWrapper>
    </ErrorBoundary>
  );
};
