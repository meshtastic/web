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
import { MdUpgrade } from 'react-icons/md';
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
} from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf, Types } from '@meshtastic/meshtasticjs';

import { VersionInfo } from '../modals/VersionInfo';
import { BottomNavItem } from './BottomNavItem';

export const BottomNav = (): JSX.Element => {
  const [showVersionInfo, setShowVersionInfo] = React.useState(false);
  const dispatch = useAppDispatch();
  const meshtasticState = useAppSelector((state) => state.meshtastic);
  const appState = useAppSelector((state) => state.app);
  const primaryChannelSettings = useAppSelector(
    (state) => state.meshtastic.radio.channels,
  ).find((channel) => channel.role === Protobuf.Channel_Role.PRIMARY)?.settings;

  return (
    <div className="z-20 flex justify-between divide-x divide-gray-300 border-t border-gray-300 bg-white dark:divide-gray-600 dark:border-gray-600 dark:bg-secondaryDark">
      <BottomNavItem tooltip="Meshtastic WebUI">
        <img
          title="Logo"
          className="my-auto w-5"
          src={appState.darkMode ? '/Logo_White.svg' : '/Logo_Black.svg'}
        />
      </BottomNavItem>

      <BottomNavItem
        tooltip="Connection Status"
        onClick={(): void => {
          dispatch(openConnectionModal());
        }}
        className={
          [
            Types.DeviceStatusEnum.DEVICE_CONNECTED,
            Types.DeviceStatusEnum.DEVICE_CONFIGURED,
          ].includes(meshtasticState.deviceStatus)
            ? 'bg-primary dark:bg-primary'
            : [
                Types.DeviceStatusEnum.DEVICE_CONNECTING,
                Types.DeviceStatusEnum.DEVICE_RECONNECTING,
                Types.DeviceStatusEnum.DEVICE_CONFIGURING,
              ].includes(meshtasticState.deviceStatus)
            ? 'bg-yellow-400 dark:bg-yellow-400'
            : ''
        }
      >
        {appState.connType === connType.BLE ? (
          <FiBluetooth className="h-4" />
        ) : appState.connType === connType.SERIAL ? (
          <FiCpu className="h-4" />
        ) : (
          <FiWifi className="h-4" />
        )}
        <div className="truncate text-xs font-medium">
          {meshtasticState.nodes.find(
            (node) => node.number === meshtasticState.radio.hardware.myNodeNum,
          )?.user?.longName ?? 'Disconnected'}
        </div>
      </BottomNavItem>

      <BottomNavItem tooltip="MQTT Status">
        {primaryChannelSettings?.uplinkEnabled &&
        primaryChannelSettings?.downlinkEnabled &&
        !meshtasticState.radio.preferences.mqttDisabled ? (
          <RiArrowUpDownLine className="h-4" />
        ) : primaryChannelSettings?.uplinkEnabled &&
          !meshtasticState.radio.preferences.mqttDisabled ? (
          <RiArrowUpLine className="h-4" />
        ) : primaryChannelSettings?.downlinkEnabled &&
          !meshtasticState.radio.preferences.mqttDisabled ? (
          <RiArrowDownLine className="h-4" />
        ) : (
          <FiX className="h-4" />
        )}
      </BottomNavItem>

      <div className="flex-grow">
        <BottomNavItem
          tooltip="Toggle Navigation"
          onClick={(): void => {
            dispatch(toggleMobileNav());
          }}
          className="md:hidden"
        >
          {appState.mobileNavOpen ? (
            <FiX className="m-auto h-4" />
          ) : (
            <FiMenu className="m-auto h-4" />
          )}
        </BottomNavItem>
      </div>

      <BottomNavItem
        tooltip={
          appState.updateAvaliable ? 'Update Avaliable' : 'Current Commit'
        }
        onClick={(): void => {
          setShowVersionInfo(true);
        }}
        className={appState.updateAvaliable ? 'animate-pulse' : ''}
      >
        {appState.updateAvaliable ? (
          <MdUpgrade className="h-4" />
        ) : (
          <FiGitBranch className="h-4" />
        )}
        <p className="text-xs opacity-60">{process.env.COMMIT_HASH}</p>
      </BottomNavItem>

      <BottomNavItem
        tooltip="Toggle Theme"
        onClick={(): void => {
          dispatch(setDarkModeEnabled(!appState.darkMode));
        }}
      >
        {appState.darkMode ? (
          <FiSun className="h-4" />
        ) : (
          <FiMoon className="h-4" />
        )}
      </BottomNavItem>

      <VersionInfo
        visible={showVersionInfo}
        onClose={(): void => {
          setShowVersionInfo(false);
        }}
      />
    </div>
  );
};
