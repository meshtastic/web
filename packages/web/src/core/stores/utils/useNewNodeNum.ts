import { useDeviceStore, useMessageStore, useNodeDBStore } from "@core/stores";
import type { Protobuf } from "@meshtastic/core";

export function useNewNodeNum(
  id: number,
  nodeInfo: Protobuf.Mesh.MyNodeInfo,
): void {
  useDeviceStore.getState().getDevice(id)?.setHardware(nodeInfo);
  useNodeDBStore.getState().getNodeDB(id)?.setNodeNum(nodeInfo.myNodeNum);
  useMessageStore
    .getState()
    .getMessageStore(id)
    ?.setNodeNum(nodeInfo.myNodeNum);
}
