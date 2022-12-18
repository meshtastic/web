import { createContext } from "react";

import { produce } from "immer";
import create from "zustand";

import { Channel, Page, MessageWithState, WaypointIDWithState, MessageState, processPacketParams, useDeviceStore } from "./deviceStore";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { useAppStore } from "./appStore";

export function getCurrentConfig(): Config {
    const { selectedDevice } = useAppStore();
    console.warn(`Selected device: ${selectedDevice}`);
    if(selectedDevice !== -1) {
        const device = useDeviceStore().getDevice(selectedDevice);
        if(device === undefined)
          throw "Invalid device selected";
        return { config: device.config, moduleConfig: device.moduleConfig };
    }
    else {
        console.warn("Requesting template config");
        // TODO: Get currently selected template instead of the first one
        let config = useConfigStore().getTemplateConfig(0);
        if(config === undefined) {
          console.warn("Creating...");
          useConfigStore().addTemplateConfig();
        }          
        console.warn("Returning template config");
        return useConfigStore().getTemplateConfig(0)!;
    }
}

export interface ConfigState {
  // Current numbering system is: positive ID for devices, negative index for templates
  configs: Map<number, Config>;   
  templateConfigs: Config[]; 

  // addDeviceConfig: (id: number) => Config;  
  // removeDeviceConfig: (id: number) => void;
  // getDeviceConfigs: () => Config[];
  // getDeviceConfig: (id: number) => Config | undefined;

  addTemplateConfig: () => Config;  
  // removeTemplateConfig: (index: number) => void;
  // getTemplateConfigs: () => Config[];
  getTemplateConfig: (index: number) => Config | undefined;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  configs: new Map(),
  templateConfigs: [],


  addTemplateConfig: () => {
    const newConfig = { config: Protobuf.LocalConfig.create(), moduleConfig: Protobuf.LocalModuleConfig.create() };
    set(
      produce<ConfigState>((draft) => {
        draft.templateConfigs.push(newConfig)
      })
    );
    return newConfig;
  },
  getTemplateConfig: (index: number) => {
    return get().templateConfigs[index];
  }

}));

export interface Config {    
    config: Protobuf.LocalConfig;
    moduleConfig: Protobuf.LocalModuleConfig;
    
    // activePage: Page; // What to do???
    // peerInfoOpen: boolean;
    // activePeer: number;
    // waypoints: Protobuf.Waypoint[];
    // regionUnset: boolean;
    // currentMetrics: Protobuf.DeviceMetrics;
    // importDialogOpen: boolean;
    // QRDialogOpen: boolean;
    // shutdownDialogOpen: boolean;
    // rebootDialogOpen: boolean;
    // pendingSettingsChanges: boolean;
  
    // setReady(ready: boolean): void;
    // setStatus: (status: Types.DeviceStatusEnum) => void;
    // setConfig: (config: Protobuf.Config) => void;
    // setModuleConfig: (config: Protobuf.ModuleConfig) => void;
    // // setHardware: (hardware: Protobuf.MyNodeInfo) => void;
    // // setMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry>) => void;
    // setActivePage: (page: Page) => void;
    // setPeerInfoOpen: (open: boolean) => void;
    // setActivePeer: (peer: number) => void;
    // setPendingSettingsChanges: (state: boolean) => void;
    // addChannel: (channel: Channel) => void;
    // addWaypoint: (waypoint: Protobuf.Waypoint) => void;
    // addNodeInfo: (nodeInfo: Protobuf.NodeInfo) => void;
    // addUser: (user: Types.PacketMetadata<Protobuf.User>) => void;
    // addPosition: (position: Types.PacketMetadata<Protobuf.Position>) => void;
    // addConnection: (connection: Types.ConnectionType) => void;
    // addMessage: (message: MessageWithState) => void;
    // addWaypointMessage: (message: WaypointIDWithState) => void;
    // addDeviceMetadataMessage: (
    //   metadata: Types.PacketMetadata<Protobuf.DeviceMetadata>
    // ) => void;
    // setMessageState: (
    //   channelIndex: number,
    //   messageId: number,
    //   state: MessageState
    // ) => void;
    // setImportDialogOpen: (open: boolean) => void;
    // setQRDialogOpen: (open: boolean) => void;
    // setShutdownDialogOpen: (open: boolean) => void;
    // setRebootDialogOpen: (open: boolean) => void;
    // processPacket: (data: processPacketParams) => void;
  }