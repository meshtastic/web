import React from 'react';

import { Button } from '@components/generic/Button';
import { openMobileNav } from '@core/slices/appSlice';
import { MenuIcon } from '@heroicons/react/outline';

import { useAppDispatch } from '../../../hooks/redux';

export const MobileNavToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();

  return (
    <div className="md:hidden">
      <Button
        icon={<MenuIcon className="w-5 h-5" />}
        onClick={(): void => {
          dispatch(openMobileNav());
        }}
        circle
      />
    </div>
  );
};
