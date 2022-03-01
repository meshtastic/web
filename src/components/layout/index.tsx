import type React from 'react';
import { useState } from 'react';

import { ErrorBoundary } from 'react-error-boundary';
import { FiMessageCircle, FiSettings } from 'react-icons/fi';
import { RiMindMap, RiRoadMapLine } from 'react-icons/ri';
import { VscExtensions } from 'react-icons/vsc';

import { routes, useRoute } from '@app/core/router';
import { IconButton } from '@components/generic/button/IconButton';
import { Sidebar } from '@components/layout/Sidebar';

import { ErrorFallback } from '../ErrorFallback';
import type { TabProps } from '../Tab';
import { Tabs } from '../Tabs';

export interface LayoutProps {
  title: string;
  icon: React.ReactNode;
  sidebarContents: React.ReactNode;
  children: React.ReactNode;
}

export const Layout = ({
  title,
  icon,
  sidebarContents,
  children,
}: LayoutProps): JSX.Element => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const route = useRoute();

  const tabs: Omit<TabProps, 'activeLeft' | 'activeRight'>[] = [
    {
      title: 'Messages',
      icon: <FiMessageCircle />,
      link: routes.messages().link,
      active: route.name === 'messages',
    },
    {
      title: 'Nodes',
      icon: <RiMindMap />,
      link: routes.nodes().link,
      active: route.name === 'nodes',
    },
    {
      title: 'Map',
      icon: <RiRoadMapLine />,
      link: routes.map().link,
      active: route.name === 'map',
    },
    {
      title: 'Extensions',
      icon: <VscExtensions />,
      link: routes.extensions().link,
      active: route.name === 'extensions',
    },
  ];

  return (
    <div className="relative flex w-full bg-white dark:bg-secondaryDark ">
      <div className="flex flex-grow">
        <Sidebar settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}>
          <div className="bg-white px-1 pt-1 drop-shadow-md dark:bg-primaryDark">
            <div className="flex h-10 gap-1">
              <div className="my-auto">
                <IconButton icon={icon} />
              </div>
              <div className="my-auto text-lg font-medium dark:text-white">
                {title}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">{sidebarContents}</div>
        </Sidebar>
      </div>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="flex h-full w-full flex-col bg-gray-300 dark:bg-secondaryDark">
          <div className="flex w-full bg-white pt-1 dark:bg-primaryDark">
            <div className="z-10 -mr-2 h-8">
              <IconButton
                className="m-1"
                icon={<FiSettings />}
                onClick={(): void => {
                  setSettingsOpen(!settingsOpen);
                }}
                active={settingsOpen}
              />
            </div>
            <Tabs tabs={tabs} />
          </div>
          <div className="flex flex-grow">{children}</div>
        </div>
      </ErrorBoundary>
    </div>
  );
};
