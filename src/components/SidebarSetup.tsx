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
import { useState } from "react";
import { Button } from "./form/Button.js";

export const SidebarSetup = (): JSX.Element => {
  // const { removeDevice } = useDeviceStore();
  // const { connection, hardware, nodes, status, currentMetrics } = useDevice();
  const { selectedDevice, setSelectedDevice, setCommandPaletteOpen } =
    useAppStore();
  // const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  const { getDevices } = useDeviceStore();
  const devices = getDevices();
  const [devicesToFlash, setSelectedToFlash] = useState<boolean[]>(devices.map(d => false));  
  console.log(`Device 0: ${devicesToFlash[0]}`);

  return (    
    <div className="bg-slate-50 relative flex flex-col w-72 flex-shrink-0 flex-col gap-2 p-2">
      <div className="h-1/2">
        <div className="flex h-16 flex-col gap-2 overflow-y-auto">        
          {devices.map((device, index) => (
            <Button
              key={index}
              color={devicesToFlash[index] ? "bg-accentMuted" : "bg-backgroundPrimary"}
              onClick={() => {
                devicesToFlash[index] = !devicesToFlash[index];
                console.log(`Set device ${index}: ${devicesToFlash[index]}`);
                setSelectedToFlash(devicesToFlash.map(b => b));                
              }}
              size="sm"
            >
              {`${device.nodes.find(d => d.data.num == device.hardware.myNodeNum)?.data.user?.longName ?? "<Not flashed yet>"}`}
            </Button>
          ))}
          
        </div>
      </div>      
      <div className="w-1/1 h-0.5 bg-accent"></div>
      <div className="h-1/2">{<Mono>Test2</Mono>}</div>
      
    </div>
  );
};
