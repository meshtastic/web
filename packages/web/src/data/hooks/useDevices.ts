import { useEffect, useMemo, useState } from "react";
import { deviceRepo } from "../repositories/index.ts";
import type { Device } from "../schema.ts";
import { useReactiveSQL } from "./useReactiveSQL.ts";

/**
 * Hook to get all devices
 */
export function useDevices() {
  const query = useMemo(() => deviceRepo.buildDevicesQuery(), []);

  const { data, status } = useReactiveSQL<Device>(
    deviceRepo.getClient(),
    query,
  );

  return {
    devices: data ?? [],
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to compute approximate storage bytes per device.
 * Fetches once on mount (not reactive — storage changes infrequently).
 */
export function useDeviceStorage() {
  const [storage, setStorage] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    void deviceRepo.getStoragePerDevice().then(setStorage);
  }, []);

  return storage;
}
