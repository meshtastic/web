import type React from 'react';

import { FiMenu } from 'react-icons/fi';

import { openMobileNav } from '@core/slices/appSlice';
import { IconButton } from '@meshtastic/components';

import { useAppDispatch } from '../../../hooks/redux';

export const MobileNavToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();

  return (
    <div className="md:hidden">
      <IconButton
        icon={<FiMenu className="w-5 h-5" />}
        onClick={(): void => {
          dispatch(openMobileNav());
        }}
      />
    </div>
  );
};
