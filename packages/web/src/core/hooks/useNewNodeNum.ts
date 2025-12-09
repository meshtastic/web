import { useDeviceStore } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";

export function useNewNodeNum(
  id: number,
  nodeInfo: Protobuf.Mesh.MyNodeInfo,
): void {
  useDeviceStore.getState().getDevice(id)?.setHardware(nodeInfo);
  // Node number is now tracked via hardware.myNodeNum, no separate nodeDB tracking needed
}
