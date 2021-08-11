import React from 'react';

import {
  AnnotationIcon,
  CogIcon,
  InformationCircleIcon,
  ViewGridIcon,
} from '@heroicons/react/outline';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer/SwipeableDrawer';

import { routes } from '../../core/router';
import { closeMobileNav, openMobileNav } from '../../core/slices/appSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Button } from '../generic/Button';
import { Logo } from './Logo';

export const MobileNav = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const mobileNavOpen = useAppSelector((state) => state.app.mobileNavOpen);

  return (
    <SwipeableDrawer
      open={mobileNavOpen}
      anchor="left"
      onClose={() => {
        dispatch(closeMobileNav());
      }}
      onOpen={() => {
        dispatch(openMobileNav());
      }}
    >
      <div className="flex flex-col dark:bg-secondaryDark h-full">
        <div className="m-auto my-6">
          <Logo />
        </div>
        <Button
          icon={<AnnotationIcon />}
          text={'Messages'}
          {...routes.messages().link}
        />
        <Button
          icon={<ViewGridIcon />}
          text={'Nodes'}
          {...routes.nodes().link}
        />
        <Button
          icon={<CogIcon />}
          text={'Settings'}
          {...routes.settings().link}
        />
        <Button
          icon={<InformationCircleIcon />}
          text={'About'}
          {...routes.about().link}
        />
      </div>
    </SwipeableDrawer>
  );
};
