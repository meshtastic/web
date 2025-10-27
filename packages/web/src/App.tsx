import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import { useTheme } from "@core/hooks/useTheme.ts";
import { SidebarProvider, useAppStore, useDeviceStore } from "@core/stores";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";

export function App() {
  const { getDevice } = useDeviceStore();
  const { selectedDeviceId, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();
  const navigate = useNavigate();
  const previousDeviceRef = useRef(getDevice(selectedDeviceId));

  const device = getDevice(selectedDeviceId);

  // Sets up light/dark mode based on user preferences or system settings
  useTheme();

  // Redirect to home when a device connects
  useEffect(() => {
    const previousDevice = previousDeviceRef.current;

    // Check if device just became available (went from undefined to defined)
    if (!previousDevice && device) {
      console.log("Device connected, redirecting to home");
      navigate({ to: "/", replace: true });
    }

    // Update the ref for next comparison
    previousDeviceRef.current = device;
  }, [device, navigate]);

  return (
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
          className="flex h-screen flex-col bg-background-primary text-text-primary"
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
  );
}
