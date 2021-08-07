import React from 'react';

import { Dialog } from '@headlessui/react';
import {
  AnnotationIcon,
  CogIcon,
  InformationCircleIcon,
  ViewGridIcon,
  XCircleIcon,
} from '@heroicons/react/outline';

import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { routes } from '../../router';
import { closeMobileNav } from '../../slices/appSlice';
import { Button } from '../generic/Button';
import { MenuButton } from './MenuButton';

export const MobileNav = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const mobileNavOpen = useAppSelector((state) => state.app.mobileNavOpen);

  return (
    <Dialog
      open={mobileNavOpen}
      onClose={() => dispatch(closeMobileNav())}
      className="flex fixed inset-0 z-10 overflow-y-auto"
    >
      <Dialog.Overlay className="fixed inset-0 backdrop-filter backdrop-blur" />

      <div className="mx-auto w-full max-w-sm m-6 p-6 transform bg-white dark:bg-secondaryDark border dark:border-gray-600 rounded-3xl">
        <Button
          className="float-right"
          clickAction={() => {
            dispatch(closeMobileNav());
          }}
        >
          <XCircleIcon className="w-6 h-6" />
        </Button>
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
      </div>
    </Dialog>
  );
};
