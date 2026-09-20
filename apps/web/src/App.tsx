import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { ConnectingOverlay } from "@components/ConnectingOverlay.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { RegionSetupReminder } from "@components/RegionSetupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import { useTheme } from "@core/hooks/useTheme.ts";
import { SidebarProvider, useAppStore, useDeviceStore } from "@core/stores";
import { useTotalUnread } from "@meshtastic/sdk-react";
import { Connections } from "@pages/Connections/index.tsx";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";

function useUnreadTitleIndicator() {
  const baseTitleRef = useRef<string>("");
  const unread = useTotalUnread();

  useEffect(() => {
    if (!baseTitleRef.current) {
      baseTitleRef.current = document.title.replace(/^●\s*/, "");
    }
    document.title =
      unread > 0 ? `● ${baseTitleRef.current}` : baseTitleRef.current;
  }, [unread]);
}

export function App() {
  useTheme();
  useUnreadTitleIndicator();

  const { getDevice } = useDeviceStore();
  const { selectedDeviceId } = useAppStore();

  const device = getDevice(selectedDeviceId);

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
      <DeviceWrapper deviceId={selectedDeviceId}>
        {/* Overlay sits outside the device-conditional branch so it shows
            during a first-time connect from the Connections screen as
            well as reconnects from inside the app. */}
        <ConnectingOverlay />
        <div
          className="flex h-screen flex-col bg-background-primary text-text-primary"
          style={{ scrollbarWidth: "thin" }}
        >
          <SidebarProvider>
            <div className="h-full flex flex-1 flex-col">
              {device ? (
                <div className="h-full flex w-full">
                  <DialogManager />
                  <KeyBackupReminder />
                  <RegionSetupReminder />
                  <CommandPalette />
                  <MapProvider>
                    <Outlet />
                  </MapProvider>
                </div>
              ) : (
                <>
                  <Connections />
                  <Footer />
                </>
              )}
            </div>
          </SidebarProvider>
        </div>
      </DeviceWrapper>
    </ErrorBoundary>
  ); // </ThemeProvider>
}
