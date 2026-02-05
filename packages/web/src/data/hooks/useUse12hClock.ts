import { useDeviceStore } from "@state/device";

/**
 * Hook to get the 12-hour clock preference from the device's DisplayConfig.
 * Reads directly from the device store to ensure it reflects any changes
 * made outside this app.
 * Falls back to false (24-hour clock) if no device is connected.
 */
export function useUse12hClock(): boolean {
  return useDeviceStore((s) => s.device?.config.display?.use12hClock ?? false);
}
