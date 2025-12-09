import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import AppLayout from "@components/AppLayout";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ThemeProvider } from "@components/theme-provider";
import { useAppStore } from "@core/stores";
import { Outlet } from "@tanstack/react-router";
import { MapProvider } from "react-map-gl/maplibre";
import { SidebarProvider } from "./components/ui/sidebar.tsx";

export function App() {
  const { selectedDeviceId } = useAppStore();

  return (
    <ThemeProvider defaultTheme="system" storageKey="meshtastic-theme">
      <SidebarProvider className="flex h-screen">
        <Toaster />
        {/* <TanStackRouterDevtools position="bottom-right" /> */}
        <DeviceWrapper deviceId={selectedDeviceId}>
          <AppLayout>
            <DialogManager />
            <KeyBackupReminder />
            <CommandPalette />
            <MapProvider>
              <Outlet />
            </MapProvider>
          </AppLayout>
        </DeviceWrapper>
      </SidebarProvider>
    </ThemeProvider>
  );
}
