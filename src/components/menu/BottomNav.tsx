import React from 'react';

import {
  FiBluetooth,
  FiCpu,
  FiGitBranch,
  FiMenu,
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
  toggleMobileNav,
} from '@app/core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Tooltip } from '@meshtastic/components';
import { Protobuf, Types } from '@meshtastic/meshtasticjs';

import { VersionInfo } from '../modals/VersionInfo';

export const BottomNav = (): JSX.Element => {
  const [showVersionInfo, setShowVersionInfo] = React.useState(false);
  const dispatch = useAppDispatch();
  const meshtasticState = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);
  const primaryChannelSettings = useAppSelector(
    (state) => state.meshtastic.radio.channels,
  ).find((channel) => channel.role === Protobuf.Channel_Role.PRIMARY)?.settings;

  return (
    <div className="z-20 flex justify-between border-t border-gray-300 bg-white dark:border-gray-600 dark:bg-secondaryDark">
      <div className="flex">
        <Tooltip content="Meshtastic WebUI">
          <div className="group flex cursor-pointer select-none border-r border-gray-300 p-1 hover:bg-gray-200 dark:border-gray-600 dark:text-white dark:hover:bg-primaryDark">
            <img
              title="Logo"
              className="w-5 dark:hidden"
              src="/Logo_Black.svg"
            />
            <img
              title="Logo"
              className="hidden w-5 dark:flex"
              src="/Logo_White.svg"
            />
          </div>
        </Tooltip>

        <Tooltip content={`Connection Status`}>
          <div
            className={`group flex w-min cursor-pointer p-1 hover:bg-opacity-80 ${
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
            <div className="truncate text-xs font-medium group-active:scale-90">
              {meshtasticState.nodes.find(
                (node) =>
                  node.number === meshtasticState.radio.hardware.myNodeNum,
              )?.user?.longName ?? 'Disconnected'}
            </div>
          </div>
        </Tooltip>
        <Tooltip content="MQTT Status">
          <div className="group flex cursor-pointer select-none border-r border-gray-300 p-1 hover:bg-gray-200 dark:border-gray-600 dark:text-white dark:hover:bg-primaryDark">
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
      <div
        onClick={(): void => {
          dispatch(toggleMobileNav());
        }}
        className="group flex w-full cursor-pointer select-none border-r border-gray-300 p-1 hover:bg-gray-200 dark:border-gray-600 dark:text-white dark:hover:bg-primaryDark md:hidden"
      >
        {appState.mobileNavOpen ? (
          <FiX className="m-auto p-0.5 group-active:scale-90" />
        ) : (
          <FiMenu className="m-auto p-0.5 group-active:scale-90" />
        )}
      </div>
      <div className="flex">
        <VersionInfo
          visible={showVersionInfo}
          onclose={(): void => {
            setShowVersionInfo(false);
          }}
        />

        <Tooltip content={`Current Commit`}>
          <div
            onClick={(): void => {
              setShowVersionInfo(true);
            }}
            className="group flex cursor-pointer select-none border-l border-gray-300 p-1 hover:bg-gray-200 dark:border-gray-600 dark:text-white dark:hover:bg-primaryDark"
          >
            <FiGitBranch className="mr-1 p-0.5 group-active:scale-90" />
            <p className="text-xs opacity-60">{process.env.COMMIT_HASH}</p>
          </div>
        </Tooltip>

        <Tooltip content={`Toggle Theme`}>
          <div
            className="group cursor-pointer border-l border-gray-300 p-1 hover:bg-gray-200 dark:border-gray-600 dark:text-white dark:hover:bg-primaryDark"
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
