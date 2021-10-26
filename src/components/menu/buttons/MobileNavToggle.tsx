import React from 'react';

import { FiMenu } from 'react-icons/fi';

import { IconButton } from '@app/components/generic/IconButton.jsx';
import { openMobileNav } from '@core/slices/appSlice';

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
