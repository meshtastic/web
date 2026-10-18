import { useDevice } from "@core/stores";

/** True once the active node is connected and configured. */
export function useDeviceConnected(): boolean {
  const { connection, connectionPhase } = useDevice();
  return connection !== undefined && connectionPhase === "configured";
}
