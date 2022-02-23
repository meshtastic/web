import type React from 'react';

import { FiMessageCircle, FiSettings } from 'react-icons/fi';
import { RiMindMap, RiRoadMapLine } from 'react-icons/ri';
import { VscExtensions } from 'react-icons/vsc';

import { NavLinkButton } from '@components/layout/Sidebar/NavLinkButton';
import { routes, useRoute } from '@core/router';
import { toggleMobileNav } from '@core/slices/appSlice';
import { useAppDispatch } from '@hooks/useAppDispatch';

export interface ButtonNavProps {
  toggleSettingsOpen: () => void;
}

export const ButtonNav = ({
  toggleSettingsOpen,
}: ButtonNavProps): JSX.Element => {
  const route = useRoute();
  const dispatch = useAppDispatch();

  return (
    <div className="z-30 flex justify-between border-t border-gray-300 bg-white px-6 py-2 dark:border-gray-600 dark:bg-primaryDark">
      <div
        onClick={(): void => {
          dispatch(toggleMobileNav());
        }}
      >
        <NavLinkButton
          active={route.name === 'messages'}
          link={routes.messages().link}
        >
          <FiMessageCircle className="h-5 w-5" />
        </NavLinkButton>
      </div>
      <div
        onClick={(): void => {
          dispatch(toggleMobileNav());
        }}
      >
        <NavLinkButton
          active={route.name === 'nodes'}
          link={routes.nodes().link}
        >
          <RiMindMap className="h-5 w-5" />
        </NavLinkButton>
      </div>
      <div
        onClick={(): void => {
          dispatch(toggleMobileNav());
        }}
      >
        <NavLinkButton active={route.name === 'map'} link={routes.map().link}>
          <RiRoadMapLine className="h-5 w-5" />
        </NavLinkButton>
      </div>
      <div
        onClick={(): void => {
          dispatch(toggleMobileNav());
        }}
      >
        <NavLinkButton
          active={route.name === 'extensions'}
          link={routes.extensions().link}
        >
          <VscExtensions className="h-5 w-5" />
        </NavLinkButton>
      </div>
      <NavLinkButton
        action={(): void => {
          toggleSettingsOpen();
        }}
      >
        <FiSettings className="h-5 w-5" />
      </NavLinkButton>
    </div>
  );
};
