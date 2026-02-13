import { useUIStore } from "@state/ui/store";
import { useDeviceDisconnectDetection } from "./useDeviceDisconnectDetection";

/**
 * Hook that shows the deviceDisconnect dialog when an unexpected disconnect occurs.
 * Should be called in ConnectedLayout to enable disconnect detection.
 *
 * Uses onDeviceStatus events from the MeshDevice for immediate detection,
 * rather than polling the database connection status.
 *
 * Does NOT show the disconnect dialog if:
 * - The deviceReboot dialog is already open (it handles its own flow)
 * - The deviceDisconnect dialog is already open
 */
export function useDeviceStatusEvents() {
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  useDeviceDisconnectDetection(() => {
    // Read latest dialog state at event time (not from a stale closure)
    const dialogs = useUIStore.getState().dialogs;

    // Don't show disconnect dialog if reboot dialog is handling it
    // or if disconnect dialog is already open
    if (!dialogs.deviceReboot && !dialogs.deviceDisconnect) {
      setDialogOpen("deviceDisconnect", true);
    }
  });
}
