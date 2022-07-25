import type React from "react";

import { majorScale, Pane } from "evergreen-ui";

import { useAppStore } from "@app/core/stores/appStore.js";
import { DeviceWrapper } from "@app/DeviceWrapper.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";

import { NoDevice } from "../misc/NoDevice.js";
import { Progress } from "../Progress.js";
import { Header } from "./Header.js";
import { Sidebar } from "./Sidebar/index.js";

export interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const { selectedDevice } = useAppStore();

  const devices = getDevices();

  return (
    <Pane
      width="100vw"
      display="flex"
      background="tint1"
      flexDirection="column"
      minHeight="100vh"
    >
      <Header />
      <Pane display="flex" flex={1} height="100%" width="100%">
        {devices.length ? (
          devices.map((device, index) => (
            <Pane
              key={index}
              width="100%"
              height="100%"
              display={index === selectedDevice ? "grid" : "none"}
              gap={majorScale(3)}
              gridTemplateColumns="16rem 1fr"
            >
              <DeviceWrapper device={device}>
                {device && device.ready ? (
                  <>
                    <Sidebar />
                    <Pane height="100%" display="flex">
                      {children}
                    </Pane>
                  </>
                ) : (
                  <>
                    <Pane
                      width="100%"
                      flexGrow={1}
                      margin={majorScale(3)}
                      borderRadius={majorScale(1)}
                      background="white"
                      elevation={1}
                    />
                    <Progress />
                  </>
                )}
              </DeviceWrapper>
            </Pane>
          ))
        ) : (
          <NoDevice />
        )}
      </Pane>
    </Pane>
  );
};
