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
    <div className="mb-4 flex flex-col space-y-3 rounded-2xl bg-[#f9e3aa] p-6 text-sm text-black">
      <p className="text-xl font-bold">Connecting to device</p>
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
      <div
        className="mt-2 cursor-pointer rounded-md bg-[#dabb6b] p-1  text-center ring-[#f9e3aa]"
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
