import React from 'react';

import { FiFileText, FiRss, FiXCircle } from 'react-icons/fi';

import { IconButton } from '@app/components/generic/IconButton.jsx';
import { useBreakpoint } from '@app/hooks/breakpoint';
import { Drawer } from '@components/generic/Drawer';
import { SidebarItem } from '@components/generic/SidebarItem';
import { Tab } from '@headlessui/react';

import { Files } from './Files';
import { RangeTest } from './RangeTest';

export const Plugins = (): JSX.Element => {
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
                Plugins
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
            <Tab
              onClick={(): void => {
                setNavOpen(false);
              }}
            >
              {({ selected }): JSX.Element => (
                <SidebarItem
                  title="Range Test"
                  description="Test the range of your Meshtastic node"
                  selected={selected}
                  icon={<FiRss className="flex-shrink-0 w-6 h-6" />}
                />
              )}
            </Tab>
            <Tab
              onClick={(): void => {
                setNavOpen(false);
              }}
            >
              {({ selected }): JSX.Element => (
                <SidebarItem
                  title="File Browser"
                  description="HTTP only file browser"
                  selected={selected}
                  icon={<FiFileText className="flex-shrink-0 w-6 h-6" />}
                />
              )}
            </Tab>
          </Tab.List>
        </Drawer>
        <div className="flex w-full">
          <Tab.Panels className="flex w-full">
            <Tab.Panel className="flex w-full">
              <RangeTest navOpen={navOpen} setNavOpen={setNavOpen} />
            </Tab.Panel>
            <Tab.Panel className="flex w-full">
              <Files navOpen={navOpen} setNavOpen={setNavOpen} />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </div>
    </Tab.Group>
  );
};
