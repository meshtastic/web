import { DeviceWrapper } from "@app/DeviceWrapper.tsx";
import { BeaconOfferNotifier } from "@components/BeaconOfferNotifier.tsx";
import { FirmwareUpdateNotifier } from "@components/FirmwareUpdate/FirmwareUpdateNotifier.tsx";
import { CommandPalette } from "@components/CommandPalette/index.tsx";
import { ConnectingOverlay } from "@components/ConnectingOverlay.tsx";
import { ConnectionsDrawer } from "@components/ConnectionsDrawer/ConnectionsDrawer.tsx";
import { NoRadioScreen } from "@components/NoRadio/NoRadioScreen.tsx";
import { DialogManager } from "@components/Dialog/DialogManager.tsx";
import { LockdownGate } from "@components/Dialog/LockdownDialog/LockdownDialog.tsx";
import { RegionSetupReminder } from "@components/RegionSetupReminder.tsx";
import { AppShell } from "@components/Shell/AppShell.tsx";
import { Toaster } from "@components/Toaster.tsx";
import { ErrorPage } from "@components/UI/ErrorPage.tsx";
import { useKeyboardInset } from "@core/hooks/useKeyboardInset.ts";
import { useTheme } from "@core/hooks/useTheme.ts";
import { cn } from "@core/utils/cn.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { useTotalUnread } from "@core/kmp/hooks";
import { useWelcomeRedirect } from "@components/Onboarding/useWelcomeRedirect.ts";
import { WELCOME_PATH } from "@core/onboarding/welcome.ts";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useCallback, useEffect, useRef } from "react";
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
  useKeyboardInset();

  const { getDevice } = useDeviceStore();
  const { selectedDeviceId } = useAppStore();

  const device = getDevice(selectedDeviceId);

  // First-time visitors go to the welcome wizard once the saved
  // connections have loaded; the wizard renders full screen, outside the
  // shell, whether or not a radio is connected yet.
  const onWelcome = useRouterState({
    select: (s) => s.location.pathname === WELCOME_PATH,
  });
  const navigate = useNavigate();
  const goToWelcome = useCallback(() => {
    void navigate({ to: "/welcome", replace: true });
  }, [navigate]);
  useWelcomeRedirect(goToWelcome, onWelcome);

  if (onWelcome) {
    return (
      <ErrorBoundary FallbackComponent={ErrorPage}>
        <Toaster />
        <DeviceWrapper deviceId={selectedDeviceId}>
          {device ? <LockdownGate /> : null}
          <Outlet />
        </DeviceWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorPage}>
      <Toaster
        className={cn(
          device && "max-sm:top-[calc(4rem+env(safe-area-inset-top))]",
        )}
      />
      <TanStackRouterDevtools position="bottom-right" />
      <DeviceWrapper deviceId={selectedDeviceId}>
        {/* Overlay sits outside the device-conditional branch so it shows
            during a first-time connect from the Connections screen as
            well as reconnects from inside the app. */}
        <ConnectingOverlay />
        {/* The Connections drawer overlays whatever page is showing. With no
            device the page says so and opens it on request. */}
        <ConnectionsDrawer />
        <div
          className={cn(
            "flex flex-col bg-background-primary text-text-primary",
            // The connection screen keeps its h-screen; the shell fits the
            // dynamic viewport so nothing scrolls under mobile browser chrome.
            device ? "h-dvh" : "h-screen",
          )}
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="h-full flex flex-1 flex-col">
            {device ? (
              // Shrinks above a keyboard that overlays the page (Safari), so
              // the composer stays in view; see useKeyboardInset.
              <div className="flex h-[calc(100dvh-var(--keyboard-inset,0px))] w-full">
                <DialogManager />
                <LockdownGate />
                <RegionSetupReminder />
                <BeaconOfferNotifier />
                <FirmwareUpdateNotifier />
                <CommandPalette />
                <AppShell>
                  <MapProvider>
                    <Outlet />
                  </MapProvider>
                </AppShell>
              </div>
            ) : (
              <NoRadioScreen />
            )}
          </div>
        </div>
      </DeviceWrapper>
    </ErrorBoundary>
  ); // </ThemeProvider>
}
