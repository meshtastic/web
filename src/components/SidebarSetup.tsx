import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { toMGRS } from "@app/core/utils/toMGRS.js";
import { BatteryWidget } from "@components/Widgets/BatteryWidget.js";
import { DeviceWidget } from "@components/Widgets/DeviceWidget.js";
import { PeersWidget } from "@components/Widgets/PeersWidget.js";
import { PositionWidget } from "@components/Widgets/PositionWidget.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { CommandLineIcon } from "@heroicons/react/24/outline";
import { Types } from "@meshtastic/meshtasticjs";

import { Input } from "./form/Input.js";
import { Mono } from "./generic/Mono.js";

export const SidebarSetup = (): JSX.Element => {
  // const { removeDevice } = useDeviceStore();
  // const { connection, hardware, nodes, status, currentMetrics } = useDevice();
  const { selectedDevice, setSelectedDevice, setCommandPaletteOpen } =
    useAppStore();
  // const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  return (    
    <div className="bg-slate-50 relative flex flex-col w-72 flex-shrink-0 flex-col gap-2 p-2">
      <div className="h-1/2">
        {<Mono>Test</Mono>}
      </div>      
      <div className="w-1/1 h-0.5 bg-accent"></div>
      <div className="h-1/2">{<Mono>Test2</Mono>}</div>
      
    </div>
  );
};
