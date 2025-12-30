import { useDevice } from "@state/index.ts";

/**
 * Hook to access remote administration authorization status.
 * Authorization is checked once when entering remote admin mode.
 */
export function useRemoteAdminAuth() {
  const device = useDevice();

  return {
    isRemoteAdmin: device.remoteAdminTargetNode !== null,
    isAuthorized: device.remoteAdminAuthorized,
    targetNodeNum: device.remoteAdminTargetNode,
  };
}
