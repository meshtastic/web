import React from "react";

import { TabbedContent, TabType } from "@components/generic/TabbedContent.js";
import { BLE } from "@components/PageComponents/Connect/BLE.js";
import { HTTP } from "@components/PageComponents/Connect/HTTP.js";
import { Serial } from "@components/PageComponents/Connect/Serial.js";
import { useAppStore } from "@core/stores/appStore.js";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export const NewDevice = () => {
  const { darkMode, setDarkMode } = useAppStore();

  const tabs: TabType[] = [
    {
      name: "Bluetooth",
      element: BLE,
      disabled: !navigator.bluetooth,
      disabledMessage:
        "Web Bluetooth is currently only supported by Chromium-based browsers",
      disabledLink:
        "https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API#browser_compatibility"
    },
    {
      name: "HTTP",
      element: HTTP,
      disabled: false,
      disabledMessage: "Unsuported connection method"
    },
    {
      name: "Serial",
      element: Serial,
      disabled: !navigator.serial,
      disabledMessage:
        "WebSerial is currently only supported by Chromium based browsers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API#browser_compatibility"
    }
  ];

  return (
    <div className="m-auto h-96 w-96">
      <TabbedContent tabs={tabs} />
    </div>
  );
};
