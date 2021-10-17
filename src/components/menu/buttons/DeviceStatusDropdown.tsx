import React from 'react';

import { FiWifi, FiWifiOff } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';

export const DeviceStatusDropdown = (): JSX.Element => {
  const ready = useAppSelector((state) => state.meshtastic.ready);

  return !ready ? (
    <Button icon={<FiWifi className="w-6 h-6" />} circle />
  ) : (
    <div className="flex bg-black rounded-full bg-opacity-20">
      <div className="flex px-2 my-auto text-white">
        <div className="my-auto mx-2 w-2 h-2 rounded-full bg-yellow-400 min-w-[2]"></div>
        Loading
      </div>
      <Button icon={<FiWifiOff className="w-6 h-6 animate-pulse" />} circle />
    </div>
  );
};
