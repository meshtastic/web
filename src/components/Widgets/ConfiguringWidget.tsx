import React, { useEffect } from "react";

import { useDevice } from "@core/providers/useDevice.js";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

import { Button } from "../Button.js";
import { Card } from "../Card.js";
import { Dropdown } from "../Dropdown.js";

export const ConfiguringWidget = (): JSX.Element => {
  const {
    hardware,
    channels,
    config,
    moduleConfig,
    setReady,
    nodes,
    connection,
  } = useDevice();

  useEffect(() => {
    if (
      hardware.myNodeNum !== 0 &&
      Object.keys(config).length === 7 &&
      Object.keys(moduleConfig).length === 7 &&
      channels.length === hardware.maxChannels
    ) {
      setReady(true);
    }
  }, [
    config,
    moduleConfig,
    channels,
    hardware.maxChannels,
    hardware.myNodeNum,
    setReady,
  ]);

  return (
    <Card className="flex-col">
      <Dropdown
        title="Config Status"
        icon={<AdjustmentsHorizontalIcon className="h-4" />}
      >
        <div className="flex flex-col gap-2 p-3">
          <ol className="flex flex-col gap-3 overflow-hidden">
            <StatusIndicator
              title="Device Info"
              current={hardware.myNodeNum ? 1 : 0}
              total={0}
            />
            <StatusIndicator title="Peers" current={nodes.length} total={0} />
            <StatusIndicator
              title="Device Config"
              current={Object.keys(config).length - 1}
              total={6}
            />
            <StatusIndicator
              title="Module Config"
              current={Object.keys(moduleConfig).length - 1}
              total={6}
            />
            <StatusIndicator
              title="Channels"
              current={channels.length}
              total={hardware.maxChannels ?? 0}
            />
          </ol>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void connection?.configure();
            }}
          >
            Retry
          </Button>
        </div>
      </Dropdown>
    </Card>
  );
};

export interface StatusIndicatorProps {
  title: string;
  current: number;
  total: number;
}

const StatusIndicator = ({
  title,
  current,
  total,
}: StatusIndicatorProps): JSX.Element => {
  return (
    <li className="relative">
      <div
        className={`absolute top-4 left-2.5 -ml-px h-full w-0.5 ${
          current >= total ? "bg-green-500" : "bg-[#f9e3aa]"
        }`}
      />
      <div className="flex">
        <div
          className={`relative z-10 flex h-5 w-5 rounded-full border-2  ${
            current === 0
              ? "border-[#dabb6b] bg-[#f9e3aa]"
              : current >= total
              ? "border-green-500 bg-green-500"
              : "border-green-500 bg-[#f9e3aa]"
          }`}
        >
          <span
            className={`m-auto h-1.5 w-1.5 rounded-full ${
              current > 0 ? "bg-green-500" : "bg-[#f9e3aa]"
            }`}
          />
        </div>

        <span className="ml-4 flex gap-1 text-sm">
          <span className="font-medium">{title}</span>
          <span className="font-mono text-slate-500">
            ({current}
            {total !== 0 && `/${total}`})
          </span>
        </span>
      </div>
    </li>
  );
};
