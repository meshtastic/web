import type React from "react";
import { useState } from "react";

import {
  Button,
  CrossIcon,
  GlobeIcon,
  IconButton,
  Link,
  majorScale,
  Pane,
  PlusIcon,
  StatusIndicator,
  Tab,
  Tablist,
  Tooltip,
} from "evergreen-ui";
import { FiGithub } from "react-icons/fi";

import { useAppStore } from "@app/core/stores/appStore.js";
import { NewDevice } from "@components/SlideSheets/NewDevice.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Types } from "@meshtastic/meshtasticjs";

export const Header = (): JSX.Element => {
  const { getDevices, removeDevice } = useDeviceStore();
  const [newConnectionOpen, setNewConnectionOpen] = useState(false);
  const { selectedDevice, setSelectedDevice } = useAppStore();

  return (
    <Pane
      is="nav"
      width="100%"
      position="sticky"
      top={0}
      backgroundColor="white"
      zIndex={10}
      height={majorScale(8)}
      flexShrink={0}
      display="flex"
      alignItems="center"
      borderBottom="muted"
    >
      <NewDevice
        open={newConnectionOpen}
        onClose={() => {
          setNewConnectionOpen(false);
        }}
      />
      <Pane
        display="flex"
        alignItems="center"
        width={majorScale(12)}
        marginRight={majorScale(22)}
      >
        <Link href="/">
          <Pane
            is="img"
            width={100}
            height={28}
            src="/Logo_Black.svg"
            cursor="pointer"
          />
        </Link>
      </Pane>
      <Tablist display="flex" marginX={majorScale(4)}>
        {getDevices().map((device, index) => (
          <Tab
            key={index}
            gap={majorScale(1)}
            isSelected={index === selectedDevice}
            onSelect={() => {
              setSelectedDevice(index);
            }}
          >
            <Hashicon value={device.hardware.myNodeNum.toString()} size={20} />
            {device.nodes.find((n) => n.data.num === device.hardware.myNodeNum)
              ?.data.user?.shortName ?? "UNK"}
            <StatusIndicator
              color={
                [
                  Types.DeviceStatusEnum.DEVICE_CONNECTED,
                  Types.DeviceStatusEnum.DEVICE_CONFIGURED,
                  Types.DeviceStatusEnum.DEVICE_CONFIGURING,
                ].includes(device.status)
                  ? "success"
                  : [
                      Types.DeviceStatusEnum.DEVICE_CONNECTING,
                      Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                      Types.DeviceStatusEnum.DEVICE_CONNECTED,
                    ].includes(device.status)
                  ? "warning"
                  : "danger"
              }
            />
          </Tab>
        ))}
      </Tablist>
      <Pane
        display="flex"
        marginLeft="auto"
        gap={majorScale(1)}
        marginRight={majorScale(2)}
      >
        <Tooltip content="Connect new device">
          <Button
            display="inline-flex"
            marginY="auto"
            appearance="primary"
            iconBefore={<PlusIcon />}
            onClick={() => {
              setNewConnectionOpen(true);
            }}
          >
            New
          </Button>
        </Tooltip>
        {getDevices().length !== 0 && (
          <Tooltip content="Disconnect active device">
            <Button
              iconBefore={CrossIcon}
              onClick={() => {
                removeDevice(selectedDevice ?? 0);
              }}
            >
              Disconnect
            </Button>
          </Tooltip>
        )}
        <Tooltip content="Visit GitHub">
          <Link
            target="_blank"
            href="https://github.com/meshtastic/meshtastic-web"
          >
            <Button iconBefore={FiGithub}>
              {import.meta.env.COMMIT_HASH ?? "DEVELOPMENT"}
            </Button>
          </Link>
        </Tooltip>
        <Tooltip content="Visit Meshtastic.org">
          <Link target="_blank" href="https://meshtastic.org/">
            <IconButton icon={GlobeIcon} />
          </Link>
        </Tooltip>
      </Pane>
    </Pane>
  );
};
