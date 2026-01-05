import { useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { deviceRepo } from "../repositories/index.ts";
import type { Device } from "../schema.ts";

/**
 * Hook to get all devices
 */
export function useDevices() {
  const query = useMemo(() => deviceRepo.buildDevicesQuery(), []);

  const { data, status } = useReactiveQuery<Device>(
    deviceRepo.getClient(),
    query,
  );

  return {
    devices: data ?? [],
    isLoading: status === "pending" && !data,
  };
}
