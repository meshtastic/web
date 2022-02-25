import type React from 'react';
import { useState } from 'react';

import { ErrorBoundary } from 'react-error-boundary';
import { FiMessageCircle, FiSettings, FiTag } from 'react-icons/fi';
import { RiMindMap, RiRoadMapLine } from 'react-icons/ri';
import { VscExtensions } from 'react-icons/vsc';

import { routes, useRoute } from '@app/core/router';
import { IconButton } from '@components/generic/button/IconButton';
import { Sidebar } from '@components/layout/Sidebar';

import { ErrorFallback } from '../ErrorFallback';
import { Tab } from '../Tab';

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

  const tabs = [
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
    {
      title: 'Temp',
      icon: <FiTag />,
      link: routes.extensions().link,
      active: route.name === 'map',
    },
  ];

  return (
    <div className="relative flex w-full bg-gray-100 dark:bg-secondaryDark md:overflow-hidden md:shadow-xl">
      <div className="flex flex-grow">
        <Sidebar settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}>
          <div className="flex gap-2 border-b border-gray-300 p-2 dark:border-gray-600">
            <IconButton icon={icon} />
            <div className="my-auto text-lg font-medium dark:text-white">
              {title}
            </div>
          </div>
          <div className="flex flex-col gap-2">{sidebarContents}</div>
        </Sidebar>
      </div>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="flex h-full w-full flex-col bg-gray-300 dark:bg-secondaryDark">
          <div className="flex w-full bg-gray-100 pt-1 dark:bg-primaryDark">
            <div className="h-8">
              <IconButton
                className="mx-1 rounded-b-none p-3"
                icon={<FiSettings />}
                onClick={(): void => {
                  setSettingsOpen(!settingsOpen);
                }}
                active={settingsOpen}
              />
            </div>
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                link={tab.link}
                title={tab.title}
                icon={tab.icon}
                active={tab.active}
                activeLeft={tabs[index - 1]?.active}
                activeRight={tabs[index + 1]?.active}
              />
            ))}
            <div className="-z-10 flex-grow shadow-md" />
          </div>
          <div className="flex flex-grow">{children}</div>
        </div>
      </ErrorBoundary>
    </div>
  );
};
