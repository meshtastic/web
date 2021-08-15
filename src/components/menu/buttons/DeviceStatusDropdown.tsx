import React from 'react';

import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { SwitchVerticalIcon } from '@heroicons/react/outline';

export const DeviceStatusDropdown = (): JSX.Element => {
  const ready = useAppSelector((state) => state.meshtastic.ready);

  return (
    <Button
      icon={
        <SwitchVerticalIcon
          className={`h-6 w-6 ${!ready ? 'animate-pulse' : ''}`}
        />
      }
      circle
    />
  );
};
