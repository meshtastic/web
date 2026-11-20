import { useDeviceStore } from "@core/stores";
import type { Protobuf } from "@core/protobuf.ts";

export function useNewNodeNum(
  id: number,
  nodeInfo: Protobuf.Mesh.MyNodeInfo,
): void {
  useDeviceStore.getState().getDevice(id)?.setHardware(nodeInfo);
}
