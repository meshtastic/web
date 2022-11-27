import type React from "react";
import { useState } from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export const Drawer = (): JSX.Element => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs = [{ title: "Notifications" }, { title: "Debug" }];

  const { config, moduleConfig, hardware, nodes, waypoints, connection } =
    useDevice();

  const [serialLogs, setSerialLogs] = useState<string>("");

  connection?.onDeviceDebugLog.subscribe((packet) => {
    setSerialLogs(serialLogs + new TextDecoder().decode(packet));
  });

  return (
    <div className={`shadow-md ${drawerOpen ? "h-40" : "h-8"}`}>
      <div className="flex h-8 bg-slate-50">
        <div
          onClick={() => {
            setDrawerOpen(!drawerOpen);
          }}
          className="ml-auto flex px-2 hover:cursor-pointer hover:bg-slate-100"
        >
          <div className="m-auto">
            {drawerOpen ? (
              <ChevronDownIcon className="h-4 text-gray-700" />
            ) : (
              <ChevronUpIcon className="h-4 text-gray-700" />
            )}
          </div>
        </div>
      </div>
      <div className={`${drawerOpen ? "flex" : "hidden"}`}>
        <div>
          {serialLogs.split("\n").map((line, index) => (
            <div key={index} className="text-sm">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
