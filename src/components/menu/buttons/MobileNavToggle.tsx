import React from 'react';

import { MenuIcon } from '@heroicons/react/outline';

import { openMobileNav } from '../../../core/slices/appSlice';
import { useAppDispatch } from '../../../hooks/redux';
import { IconButton } from '../../generic/IconButton';

export const MobileNavToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();

  return (
    <div className="md:hidden">
      <IconButton
        onClick={() => {
          dispatch(openMobileNav());
        }}
      >
        <MenuIcon className="h-6 w-6" />
      </IconButton>
    </div>
  );
};
