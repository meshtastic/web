import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import AppLayout from "@components/AppLayout";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ThemeProvider } from "@components/theme-provider";
import { ErrorPage } from "@components/ui/error-page.tsx";
import { useAppStore, useDeviceStore } from "@core/stores";
import { Connections } from "@pages/Connections/index.tsx";
import { Outlet } from "@tanstack/react-router";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";
import { SidebarProvider } from "./components/ui/sidebar.tsx";

export function App() {
  const { getDevice } = useDeviceStore();
  const { selectedDeviceId } = useAppStore();

  const device = getDevice(selectedDeviceId);

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <ThemeProvider defaultTheme="system" storageKey="meshtastic-theme">
        <SidebarProvider className="flex h-screen">
          <Toaster />
          {/* <TanStackRouterDevtools position="bottom-right" /> */}
          <DeviceWrapper deviceId={selectedDeviceId}>
            <AppLayout>
              {device ? (
                <>
                  <DialogManager />
                  <KeyBackupReminder />
                  <CommandPalette />
                  <MapProvider>
                    <Outlet />
                  </MapProvider>
                </>
              ) : (
                <Connections />
              )}
            </AppLayout>
          </DeviceWrapper>
        </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
