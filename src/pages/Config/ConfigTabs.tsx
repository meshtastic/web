import { Fragment, useContext } from "react";
import { Network } from "@components/PageComponents/Config/Network.js";
import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.js";
import { Device } from "@components/PageComponents/Config/Device.js";
import { Display } from "@components/PageComponents/Config/Display.js";
import { LoRa } from "@components/PageComponents/Config/LoRa.js";
import { Position } from "@components/PageComponents/Config/Position.js";
import { Power } from "@components/PageComponents/Config/Power.js";
import { DeviceContext, useDevice } from "@core/stores/deviceStore.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@components/UI/Tabs.js";
import { DeviceConfig } from "./DeviceConfig";
import { ModuleConfig } from "./ModuleConfig";

export const ConfigTabs = (): JSX.Element => {    
    const tabs = [
      {
        label: "Device",
        element: DeviceConfig,
        count: 0
      },
      {
        label: "Module",
        element: ModuleConfig
      }
    ];
  
    return (
      <Tabs defaultValue="Device">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.label}
              value={tab.label}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.label} value={tab.label} className="border-0 p-0">
            <tab.element />
          </TabsContent>
        ))}
      </Tabs>
    );
  };
  