import React from 'react';

import { FiXCircle } from 'react-icons/fi';

import { IconButton } from '@app/components/generic/IconButton.jsx';
import { useBreakpoint } from '@app/hooks/breakpoint';
import { Drawer } from '@components/generic/Drawer';
import { SidebarItem, SidebarItemProps } from '@components/generic/SidebarItem';
import { Tab } from '@headlessui/react';

export interface PageLayoutProps {
  title: string;
  sidebarItems: SidebarItemProps[];
  panels: JSX.Element[];
  emptyMessage?: string;
}

export const PageLayout = ({
  title,
  sidebarItems,
  panels,
  emptyMessage,
}: PageLayoutProps): JSX.Element => {
  const [navOpen, setNavOpen] = React.useState(false);

  const { breakpoint } = useBreakpoint();

  return (
    <Tab.Group>
      <div className="relative flex w-full dark:text-white">
        <Drawer
          open={breakpoint === 'sm' ? navOpen : true}
          permenant={breakpoint !== 'sm'}
          onClose={(): void => {
            setNavOpen(!navOpen);
          }}
        >
          <Tab.List className="flex flex-col border-b divide-y divide-gray-300 dark:divide-gray-600 dark:border-gray-600">
            <div className="flex items-center justify-between m-8 mr-6 md:my-10">
              <div className="text-4xl font-extrabold leading-none tracking-tight">
                {title}
              </div>
              <div className="md:hidden">
                <IconButton
                  icon={<FiXCircle className="w-5 h-5" />}
                  onClick={(): void => {
                    setNavOpen(false);
                  }}
                />
              </div>
            </div>
            {!sidebarItems.length && (
              <span className="p-4 text-sm text-gray-400 dark:text-gray-600">
                {emptyMessage}
              </span>
            )}
            {sidebarItems.map((props, index) => (
              <Tab
                key={index}
                onClick={(): void => {
                  setNavOpen(false);
                }}
              >
                {({ selected }): JSX.Element => (
                  <SidebarItem {...props} selected={selected} />
                )}
              </Tab>
            ))}
          </Tab.List>
        </Drawer>
        <div className="flex w-full">
          <Tab.Panels className="flex w-full">
            {panels.map((Panel, index) => (
              <Tab.Panel key={index} className="flex w-full">
                {React.cloneElement(Panel, {
                  key: index,
                  navOpen: navOpen,
                  setNavOpen: setNavOpen,
                })}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </div>
      </div>
    </Tab.Group>
  );
};
