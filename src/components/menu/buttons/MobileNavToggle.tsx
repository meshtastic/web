import React from 'react';

import { MenuIcon } from '@heroicons/react/outline';

import { useAppDispatch } from '../../../hooks/redux';
import { openMobileNav } from '../../../slices/appSlice';
import { Button } from '../../generic/Button';

export const MobileNavToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();

  return (
    <Button
      clickAction={() => {
        dispatch(openMobileNav());
      }}
      className="md:hidden"
    >
      <MenuIcon className="h-6 w-6" />
    </Button>
  );
};
