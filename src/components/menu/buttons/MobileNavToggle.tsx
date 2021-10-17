import React from 'react';

import { FiMenu } from 'react-icons/fi';

import { Button } from '@components/generic/Button';
import { openMobileNav } from '@core/slices/appSlice';

import { useAppDispatch } from '../../../hooks/redux';

export const MobileNavToggle = (): JSX.Element => {
  const dispatch = useAppDispatch();

  return (
    <div className="md:hidden">
      <Button
        icon={<FiMenu className="w-5 h-5" />}
        onClick={(): void => {
          dispatch(openMobileNav());
        }}
        circle
      />
    </div>
  );
};
