import React from 'react';

import {
  FiBell,
  FiBluetooth,
  FiCpu,
  FiGitBranch,
  FiMoon,
  FiSun,
  FiWifi,
} from 'react-icons/fi';

import {
  connType,
  openConnectionModal,
  setDarkModeEnabled,
} from '@app/core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Types } from '@meshtastic/meshtasticjs';

// export interface BottomNavProps {

// }

export const BottomNav = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const meshtasticState = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);
  // @ts-ignore define version string global
  const version = window.__COMMIT_HASH__ as string;

  return (
    <div className="flex justify-between bg-white border-t border-gray-300 dark:bg-secondaryDark dark:border-gray-600">
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
            (node) => node.number === meshtasticState.radio.hardware.myNodeNum,
          )?.user?.longName ?? 'Disconnected'}
        </div>
      </div>

      <div className="flex">
        <a
          href={`https://github.com/meshtastic/meshtastic-web/commit/${version}`}
          target="_blank"
          rel="noreferrer"
          className="flex p-1 border-l border-gray-300 cursor-pointer select-none group dark:border-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-primaryDark"
        >
          <FiGitBranch className="p-0.5 mr-1 group-active:scale-90" />
          <p className="text-xs opacity-60">{version}</p>
        </a>
        <div className="flex p-1 border-l border-gray-300 cursor-pointer select-none group dark:border-gray-600 dark:text-white hover:bg-gray-200 dark:hover:bg-primaryDark">
          <FiBell className="p-0.5 mr-1 group-active:scale-90" />
          <p className="text-xs opacity-60">Example Notification</p>
        </div>
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
      </div>
    </div>
  );
};
