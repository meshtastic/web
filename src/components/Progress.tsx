import React, { useEffect } from "react";

import {
  Button,
  majorScale,
  Pane,
  ResetIcon,
  Spinner,
  StatusIndicator,
} from "evergreen-ui";

import { useDevice } from "@core/providers/useDevice.js";

export const Progress = (): JSX.Element => {
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
    <Pane
      display="flex"
      flexGrow={1}
      margin={majorScale(3)}
      borderRadius={majorScale(1)}
      elevation={1}
      background="white"
    >
      <Pane display="flex" margin="auto" gap={majorScale(6)}>
        <Pane
          marginY="auto"
          display="flex"
          height="72px"
          width="72px"
          minWidth="72px"
          backgroundColor="#F8E3DA"
          borderRadius="50%"
        >
          <Spinner height="32px" width="32px" margin="auto" />
        </Pane>
        <Pane>
          <Pane display="flex" flexDirection="column">
            <StatusIndicator
              color={hardware.myNodeNum !== 0 ? "success" : "disabled"}
            >
              Device Info
            </StatusIndicator>
            <StatusIndicator color={nodes.length ? "success" : "disabled"}>
              Peers ({nodes.length})
            </StatusIndicator>
            <StatusIndicator
              color={Object.keys(config).length === 7 ? "success" : "disabled"}
            >
              Device Config {`(${Object.keys(config).length - 1} / 6)`}
            </StatusIndicator>
            <StatusIndicator
              color={
                Object.keys(moduleConfig).length === 7 ? "success" : "disabled"
              }
            >
              Module Config {`(${Object.keys(moduleConfig).length - 1} / 6)`}
            </StatusIndicator>
            <StatusIndicator
              color={
                channels.length > 0 && channels.length === hardware.maxChannels
                  ? "success"
                  : "disabled"
              }
            >
              Channels{" "}
              {hardware.myNodeNum !== 0 &&
                `(${channels.length} / ${hardware.maxChannels})`}
            </StatusIndicator>
            <Button
              onClick={() => {
                void connection?.configure();
              }}
              iconBefore={ResetIcon}
            >
              Retry
            </Button>
          </Pane>
        </Pane>
      </Pane>
    </Pane>
  );
};
