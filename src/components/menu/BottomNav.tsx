import React from 'react';

import {
  FiBell,
  FiBluetooth,
  FiCpu,
  FiGitBranch,
  FiMoon,
  FiSun,
  FiWifi,
  FiX,
} from 'react-icons/fi';
import {
  RiArrowDownLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
} from 'react-icons/ri';

import {
  connType,
  openConnectionModal,
  setDarkModeEnabled,
} from '@app/core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf, Types } from '@meshtastic/meshtasticjs';

import { Tooltip } from '../generic/Tooltip';

// export interface BottomNavProps {

// }

export const BottomNav = (): JSX.Element => {
  const [showVersionInfo, setShowVersionInfo] = React.useState(false);
  const dispatch = useAppDispatch();
  const meshtasticState = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);
  const primaryChannelSettings = useAppSelector(
    (state) => state.meshtastic.radio.channels,
  ).find((channel) => channel.channel.role === Protobuf.Channel_Role.PRIMARY)
    ?.channel.settings;

  return (
    <div className="flex justify-between bg-white border-t border-gray-300 dark:bg-secondaryDark dark:border-gray-600">
      <div className="flex">
        <Tooltip contents={`Connection Status`}>
          <div
            className={`flex p-1 cursor-pointer group w-min hover:bg-opacity-80 ${
              [
                Types.DeviceStatusEnum.DEVICE_CONNECTED,
                Types.DeviceStatusEnum.DEVICE_CONFIGURED,
              ].includes(meshtasticState.deviceStatus)
                ? 'bg-primary'
                : [
                    Types.DeviceStatusEnum.DEVICE_CONNECTING,
                    Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                    Types.DeviceStatusEnum.DEVICE_CONFIGURING,
                  ].includes(meshtasticState.deviceStatus)
                ? 'bg-yellow-400'
                : 'bg-gray-400'
            }`}
            onClick={(): void => {
              dispatch(dispatch(openConnectionModal()));
            }}
          >
            {appState.connType === connType.BLE ? (
              <FiBluetooth className="mr-1 p-0.5 group-active:scale-90" />
            ) : appState.connType === connType.SERIAL ? (
              <FiCpu className="mr-1 p-0.5 group-active:scale-90" />
            ) : (
              <FiWifi className="mr-1 p-0.5 group-active:scale-90" />
            )}
            <div className="text-xs font-medium truncate group-active:scale-90">
              {meshtasticState.nodes.find(
                (node) =>
                  node.number === meshtasticState.radio.hardware.myNodeNum,
              )?.user?.longName ?? 'Disconnected'}
            </div>
          </div>
        </Tooltip>
        <Tooltip contents={`MQTT Status`}>
          <div className="flex p-1 border-r border-gray-300 cursor-pointer select-none group dark:border-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-primaryDark">
            {primaryChannelSettings?.uplinkEnabled &&
            primaryChannelSettings?.downlinkEnabled &&
            !meshtasticState.radio.preferences.mqttDisabled ? (
              <RiArrowUpDownLine className="p-0.5 group-active:scale-90" />
            ) : primaryChannelSettings?.uplinkEnabled &&
              !meshtasticState.radio.preferences.mqttDisabled ? (
              <RiArrowUpLine className="p-0.5 group-active:scale-90" />
            ) : primaryChannelSettings?.downlinkEnabled &&
              !meshtasticState.radio.preferences.mqttDisabled ? (
              <RiArrowDownLine className="p-0.5 group-active:scale-90" />
            ) : (
              <FiX className="p-0.5" />
            )}
          </div>
        </Tooltip>
      </div>

      <div className="flex">
        <Tooltip contents={`Current Commit`}>
          <div
            onClick={(): void => {
              setShowVersionInfo(true);
            }}
            className="flex p-1 border-l border-gray-300 cursor-pointer select-none group dark:border-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-primaryDark"
          >
            <FiGitBranch className="p-0.5 mr-1 group-active:scale-90" />
            <p className="text-xs opacity-60">{process.env.COMMIT_HASH}</p>
          </div>
        </Tooltip>
        <Tooltip contents={`Notifications`}>
          <div className="flex p-1 border-l border-gray-300 cursor-pointer select-none group dark:border-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-primaryDark">
            <FiBell className="p-0.5 mr-1 group-active:scale-90" />
            <p className="text-xs opacity-60">Example Notification</p>
          </div>
        </Tooltip>
        <Tooltip contents={`Toggle Theme`}>
          <div
            className="p-1 border-l border-gray-300 cursor-pointer group dark:border-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-primaryDark"
            onClick={(): void => {
              dispatch(setDarkModeEnabled(!appState.darkMode));
            }}
          >
            {appState.darkMode ? (
              <FiSun className="p-0.5 group-active:scale-90" />
            ) : (
              <FiMoon className="p-0.5 group-active:scale-90" />
            )}
          </div>
        </Tooltip>
      </div>
    </div>
  );
};
