import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import AppLayout from "@components/AppLayout";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/ui/error-page.tsx";
import Footer from "@components/ui/footer.tsx";
import { useTheme } from "@core/hooks/useTheme.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { Connections } from "@pages/Connections/index.tsx";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";

export function App() {
  useTheme();

  const { getDevice } = useDeviceStore();
  const { selectedDeviceId } = useAppStore();

  const device = getDevice(selectedDeviceId);

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Toaster />
      <TanStackRouterDevtools position="bottom-right" />
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
            <>
              <Connections />
              <Footer />
            </>
          )}
        </AppLayout>
      </DeviceWrapper>
    </ErrorBoundary>
  );
}