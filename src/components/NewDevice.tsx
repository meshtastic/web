import type React from "react";

import { FiBluetooth, FiTerminal, FiWifi } from "react-icons/fi";

import { TabbedContent, TabType } from "./layout/page/TabbedContent.js";
import { BLE } from "./PageComponents/Connect/BLE.js";
import { HTTP } from "./PageComponents/Connect/HTTP.js";
import { Serial } from "./PageComponents/Connect/Serial.js";

export const NewDevice = () => {
  const tabs: TabType[] = [
    {
      name: "BLE",
      icon: <FiBluetooth className="h-4" />,
      element: BLE,
    },
    {
      name: "HTTP",
      icon: <FiWifi className="h-4" />,
      element: HTTP,
    },
    {
      name: "Serial",
      icon: <FiTerminal className="h-4" />,
      element: Serial,
    },
  ];

  return (
    <div className="w-96 h-96 m-auto">
      <TabbedContent tabs={tabs} />
    </div>
  );
};
