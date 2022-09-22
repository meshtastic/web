import type React from "react";

import { Hashicon } from "@emeraldpay/hashicon-react";
import { XCircleIcon } from "@heroicons/react/24/outline";

import { Button } from "../Button.js";

export interface DeviceWidgetProps {
  name: string;
  nodeNum: string;
  disconnected: boolean;
  disconnect: () => void;
  reconnect: () => void;
}

export const DeviceWidget = ({
  name,
  nodeNum,
  disconnected,
  disconnect,
  reconnect,
}: DeviceWidgetProps): JSX.Element => {
  return (
    <div className="relative rounded-xl bg-emerald-400 overflow-hidden">
      <div className="absolute w-full h-full bottom-20">
        <Hashicon size={350} value={nodeNum} />
      </div>
      <div className="flex backdrop-blur-md backdrop-brightness-50 backdrop-hue-rotate-30 p-3">
        <div className="drop-shadow-md">
          <Hashicon size={96} value={nodeNum} />
        </div>
        <div className="w-full flex flex-col">
          <span className="font-bold text-slate-200 ml-auto text-xl whitespace-nowrap">
            {name}
          </span>
          <div className="ml-auto my-auto">
            <Button
              onClick={disconnected ? reconnect : disconnect}
              variant={disconnected ? "secondary" : "primary"}
              size="sm"
              iconAfter={<XCircleIcon className="h-4" />}
            >
              {disconnected ? "Reconnect" : "Disconnect"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
