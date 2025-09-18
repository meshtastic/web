import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import { SidebarProvider, useAppStore, useDeviceStore } from "@core/stores";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";
import { ThemeProvider } from "./components/theme-provider.tsx";

export function App() {
  const { getDevice } = useDeviceStore();
  const { selectedDeviceId, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();

  const device = getDevice(selectedDeviceId);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="web-client-theme">
      <ErrorBoundary FallbackComponent={ErrorPage}>
        <NewDeviceDialog
          open={connectDialogOpen}
          onOpenChange={(open) => {
            setConnectDialogOpen(open);
          }}
        />
        <Toaster />
        <TanStackRouterDevtools position="bottom-right" />
        <DeviceWrapper deviceId={selectedDeviceId}>
          <div
            className="flex h-screen flex-col"
            style={{ scrollbarWidth: "thin" }}
          >
            <SidebarProvider>
              <div className="h-full flex flex-col">
                {device ? (
                  <div className="h-full flex w-full">
                    <DialogManager />
                    <KeyBackupReminder />
                    <CommandPalette />
                    <MapProvider>
                      <Outlet />
                    </MapProvider>
                  </div>
                ) : (
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
    </ThemeProvider>
  );
}
