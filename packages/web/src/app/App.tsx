import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { ThemeProvider } from "@app/shared/components/ui/theme-provider.tsx";
import { DialogManager } from "@shared/components/Dialog/DialogManager";
import { Toaster } from "@shared/components/Toaster";
import { SidebarProvider } from "@shared/components/ui/sidebar";
import { useDeviceStore } from "@state/index.ts";
import { Outlet } from "@tanstack/react-router";
import { AppLayout } from "./layouts/index.ts";

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
            <Outlet />
          </AppLayout>
        </DeviceWrapper>
      </SidebarProvider>
    </ThemeProvider>
  );
}
