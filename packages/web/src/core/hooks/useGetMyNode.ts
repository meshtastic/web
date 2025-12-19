import { useDevice, useDeviceContext } from "@core/stores";
import { useNodes } from "@db/hooks";

/**
 * Hook to get the current device's node details from the database.
 * Combines the device store's myNodeNum with the nodes from the database.
 */
export function useGetMyNode() {
  const { deviceId } = useDeviceContext();
  const { getMyNodeNum } = useDevice();
  const { nodeMap } = useNodes(deviceId);

  const myNodeNum = getMyNodeNum();

  const myNode = myNodeNum ? nodeMap.get(myNodeNum) : undefined;

  return {
    myNodeNum,
    myNode,
  };
}
