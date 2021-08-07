import React from 'react';

import {
  AnnotationIcon,
  CogIcon,
  InformationCircleIcon,
  ViewGridIcon,
} from '@heroicons/react/outline';

import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { routes } from '../../router';
import { closeMobileNav } from '../../slices/appSlice';
import { Drawer } from '../generic/Drawer';
import { MenuButton } from './MenuButton';

export const MobileNav = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const mobileNavOpen = useAppSelector((state) => state.app.mobileNavOpen);

  return (
    <Drawer
      open={mobileNavOpen}
      onClose={() => {
        dispatch(closeMobileNav());
      }}
    >
      <div>
        <MenuButton
          icon={<AnnotationIcon />}
          text={'Messages'}
          link={routes.messages().link}
          clickAction={() => {
            dispatch(closeMobileNav());
          }}
        />
        <MenuButton
          icon={<ViewGridIcon />}
          text={'Nodes'}
          link={routes.nodes().link}
          clickAction={() => {
            dispatch(closeMobileNav());
          }}
        />
        <MenuButton
          icon={<CogIcon />}
          text={'Settings'}
          link={routes.settings().link}
          clickAction={() => {
            dispatch(closeMobileNav());
          }}
        />
        <MenuButton
          icon={<InformationCircleIcon />}
          text={'About'}
          link={routes.about().link}
          clickAction={() => {
            dispatch(closeMobileNav());
          }}
        />
      </div>
    </Drawer>
  );
};
