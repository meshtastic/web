import { useDeviceStore, useMessageStore } from "@core/stores";
import type { Protobuf } from "@meshtastic/sdk";

export function useNewNodeNum(id: number, nodeInfo: Protobuf.Mesh.MyNodeInfo): void {
  useDeviceStore.getState().getDevice(id)?.setHardware(nodeInfo);
  useMessageStore.getState().getMessageStore(id)?.setNodeNum(nodeInfo.myNodeNum);
}
