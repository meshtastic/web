import type React from "react";

import {
  Badge,
  Heading,
  Link,
  majorScale,
  MapMarkerIcon,
  Pane,
} from "evergreen-ui";
import { FiBluetooth, FiTerminal, FiWifi } from "react-icons/fi";

import { toMGRS } from "@app/core/utils/toMGRS.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Types } from "@meshtastic/meshtasticjs";

export const DeviceCard = (): JSX.Element => {
  const { hardware, nodes, status, connection } = useDevice();
  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  return (
    <Pane
      display="flex"
      flexGrow={1}
      flexDirection="column"
      marginTop="auto"
      gap={majorScale(1)}
    >
      <Pane display="flex" gap={majorScale(2)}>
        <Hashicon value={hardware.myNodeNum.toString()} size={42} />
        <Pane flexGrow={1}>
          <Heading>{myNode?.data.user?.longName}</Heading>
          <Link
            target="_blank"
            href="https://github.com/meshtastic/meshtastic-device/releases/"
          >
            <Badge
              color="green"
              width="100%"
              marginRight={8}
              display="flex"
              marginTop={4}
            >
              {hardware.firmwareVersion}
            </Badge>
          </Link>
        </Pane>
      </Pane>
      <Pane display="flex" gap={majorScale(1)}>
        <MapMarkerIcon />
        <Badge
          color={myNode?.data.position?.latitudeI ? "green" : "red"}
          display="flex"
          width="100%"
        >
          {toMGRS(
            myNode?.data.position?.latitudeI,
            myNode?.data.position?.longitudeI
          )}
        </Badge>
      </Pane>
      <Pane display="flex" gap={majorScale(1)}>
        {connection?.connType === "ble" && <FiBluetooth />}
        {connection?.connType === "http" && <FiWifi />}
        {connection?.connType === "serial" && <FiTerminal />}
        <Badge
          color={
            [
              Types.DeviceStatusEnum.DEVICE_CONNECTED,
              Types.DeviceStatusEnum.DEVICE_CONFIGURED,
              Types.DeviceStatusEnum.DEVICE_CONFIGURING,
            ].includes(status)
              ? "green"
              : [
                  Types.DeviceStatusEnum.DEVICE_CONNECTING,
                  Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                  Types.DeviceStatusEnum.DEVICE_CONNECTED,
                ].includes(status)
              ? "orange"
              : "red"
          }
          display="flex"
          width="100%"
        >
          {[
            Types.DeviceStatusEnum.DEVICE_CONNECTED,
            Types.DeviceStatusEnum.DEVICE_CONFIGURED,
            Types.DeviceStatusEnum.DEVICE_CONFIGURING,
          ].includes(status)
            ? "Connected"
            : [
                Types.DeviceStatusEnum.DEVICE_CONNECTING,
                Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                Types.DeviceStatusEnum.DEVICE_CONNECTED,
              ].includes(status)
            ? "Connecting"
            : "Disconnected"}
        </Badge>
      </Pane>
    </Pane>
  );
};
