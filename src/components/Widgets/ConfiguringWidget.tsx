import React, { useEffect } from "react";

import { useDevice } from "@core/providers/useDevice.js";

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
    <div className="p-6 flex flex-col rounded-2xl mb-4 text-sm space-y-3 bg-[#f9e3aa] text-black">
      <p className="text-xl font-bold">Connecting to device</p>
      <ol className="flex flex-col overflow-hidden gap-3">
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
      <div
        className="mt-2 rounded-md bg-[#dabb6b] p-1 ring-[#f9e3aa]  cursor-pointer text-center"
        onClick={() => {
          void connection?.configure();
        }}
      >
        Retry
      </div>
    </div>
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
          className={`flex relative z-10 h-5 w-5 rounded-full border-2  ${
            current === 0
              ? "border-[#dabb6b] bg-[#f9e3aa]"
              : current >= total
              ? "bg-green-500 border-green-500"
              : "bg-[#f9e3aa] border-green-500"
          }`}
        >
          <span
            className={`m-auto h-1.5 w-1.5 rounded-full ${
              current > 0 ? "bg-green-500" : "bg-[#f9e3aa]"
            }`}
          />
        </div>

        <span className="flex text-sm ml-4 gap-1">
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
