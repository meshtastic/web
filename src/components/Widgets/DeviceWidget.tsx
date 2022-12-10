import type React from "react";

import { Button } from "@components/form/Button.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { XCircleIcon } from "@heroicons/react/24/outline";

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
  reconnect
}: DeviceWidgetProps): JSX.Element => {
  return (
    <div className="relative flex shrink-0 flex-col overflow-hidden rounded-md bg-white text-sm text-black shadow-md">
      <div className="absolute bottom-20 h-full w-full">
        <Hashicon size={350} value={nodeNum} />
      </div>
      <div className="flex p-3 backdrop-blur-md backdrop-brightness-50 backdrop-hue-rotate-30">
        <div className="drop-shadow-md">
          <Hashicon size={96} value={nodeNum} />
        </div>
        <div className="flex w-full flex-col">
          <span className="ml-auto whitespace-nowrap text-xl font-bold text-slate-200">
            {name}
          </span>
          <div className="my-auto ml-auto">
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
