import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { NewDeviceDialog } from "@components/Dialog/NewDeviceDialog.tsx";
import { KeyBackupReminder } from "@components/KeyBackupReminder.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import Footer from "@components/UI/Footer.tsx";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@components/UI/sidebar.tsx";
import { useAppStore, useDeviceStore, useHeaderStore } from "@core/stores";
import { Dashboard } from "@pages/Dashboard/index.tsx";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "react-error-boundary";
import { MapProvider } from "react-map-gl/maplibre";
import { AppSidebar } from "./components/AppSidebar/app-sidebar.tsx";
import { HeaderActions } from "./components/Header/index.ts";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { NodeSidebar } from "./components/NodeSidebar/node-sidebar.tsx";

export function App() {
  const { getDevice } = useDeviceStore();
  const { selectedDeviceId, setConnectDialogOpen, connectDialogOpen } =
    useAppStore();
  const { title, actions } = useHeaderStore();

  const device = getDevice(selectedDeviceId);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="web-client-theme">
      <ErrorBoundary FallbackComponent={ErrorPage}>
        <NewDeviceDialog
          open={connectDialogOpen}
          onOpenChange={setConnectDialogOpen}
        />
        <Toaster />
        <TanStackRouterDevtools position="bottom-right" />

        <DeviceWrapper deviceId={selectedDeviceId}>
          <div className="flex h-[100dvh] overflow-hidden">
            {device ? (
              <SidebarProvider defaultOpen>
                <AppSidebar />
                <SidebarInset>
                  <DialogManager />
                  <KeyBackupReminder />
                  <CommandPalette />

                  <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger />
                    {/* Breadcrumbs slot (optional / future) */}
                    <nav
                      aria-label="Breadcrumb"
                      className="hidden sm:flex items-center gap-2"
                    >
                      {/* <Breadcrumbs /> */}
                    </nav>

                    <div className="ml-2 min-w-0 truncate font-medium">
                      {title || "—"}
                    </div>
                    <div className="ml-auto" />
                    <HeaderActions actions={actions} />
                  </header>

                  <MapProvider>
                    <main className="flex-1 min-h-0 overflow-hidden">
                      <Outlet />
                    </main>
                  </MapProvider>

                  <Footer hotkeyLabel="Ctrl+K or Cmd+K" />
                </SidebarInset>
                <NodeSidebar />
              </SidebarProvider>
            ) : (
              <div className="flex h-full w-full flex-col">
                <main className="flex-1 min-h-0 overflow-auto">
                  <Dashboard />
                </main>
                <Footer />
              </div>
            )}
          </div>
        </DeviceWrapper>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
