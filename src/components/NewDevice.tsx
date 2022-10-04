import type React from "react";
import { useEffect, useState } from "react";

import { FiBluetooth, FiTerminal, FiWifi } from "react-icons/fi";

import { TabbedContent, TabType } from "./layout/page/TabbedContent.js";
import { BLE } from "./PageComponents/Connect/BLE.js";
import { HTTP } from "./PageComponents/Connect/HTTP.js";
import { Serial } from "./PageComponents/Connect/Serial.js";

export const NewDevice = () => {
  const [tabs, _setTabs] = useState<TabType[]>([
    {
      name: "BLE",
      icon: <FiBluetooth className="h-4" />,
      element: BLE,
      disabled: !navigator.bluetooth
    },
    {
      name: "HTTP",
      icon: <FiWifi className="h-4" />,
      element: HTTP,
      disabled: false
    },
    {
      name: "Serial",
      icon: <FiTerminal className="h-4" />,
      element: Serial,
      disabled: !navigator.serial
    }
  ]);

  return (
    <div className="m-auto h-96 w-96">
      <TabbedContent tabs={tabs} />
    </div>
  );
};
