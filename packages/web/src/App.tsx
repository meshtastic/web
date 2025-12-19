import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import AppLayout from "@components/AppLayout";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ThemeProvider } from "@components/theme-provider";
import { useDeviceStore } from "@core/stores";
import { Outlet } from "@tanstack/react-router";
import { SidebarProvider } from "@shared/components/ui/sidebar.tsx";

export function App() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);

  return (
    <ThemeProvider defaultTheme="system">
      <SidebarProvider className="flex h-screen">
        <Toaster />
        {/* <TanStackRouterDevtools position="bottom-right" /> */}
        <DeviceWrapper deviceId={activeDeviceId}>
          <AppLayout>
            <DialogManager />
            {/* <KeyBackupReminder /> */}
            {/* <CommandPalette /> */}
            <Outlet />
          </AppLayout>
        </DeviceWrapper>
      </SidebarProvider>
    </ThemeProvider>
  );
}
