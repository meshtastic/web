import type React from 'react';

import { Drawer } from '@components/generic/Drawer';
import { closeMobileNav } from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';
import { useAppSelector } from '@hooks/useAppSelector';

import { Logo } from './Logo';
import { Navigation } from './Navigation';

export const MobileNav = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const mobileNavOpen = useAppSelector((state) => state.app.mobileNavOpen);

  return (
    <Drawer
      open={mobileNavOpen}
      onClose={(): void => {
        dispatch(closeMobileNav());
      }}
      className="z-50"
    >
      <div className="flex flex-col">
        <div className="m-auto my-6">
          <Logo />
        </div>
        <Navigation
          onClick={(): void => {
            dispatch(closeMobileNav());
          }}
        />
      </div>
    </Drawer>
  );
};
