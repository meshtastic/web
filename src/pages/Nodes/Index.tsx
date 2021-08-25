import React from 'react';

import Avatar from 'boring-avatars';

import { useBreakpoint } from '@app/hooks/breakpoint';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Drawer } from '@components/generic/Drawer';
import { SidebarItem } from '@components/generic/SidebarItem';
import { Tab } from '@headlessui/react';
import { XCircleIcon } from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { Node } from './Node';

export const Nodes = (): JSX.Element => {
  const [navOpen, setNavOpen] = React.useState(false);

  const { breakpoint } = useBreakpoint();

  const nodes = useAppSelector((state) => state.meshtastic.nodes);

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
                Nodes
              </div>
              <div className="md:hidden">
                <Button
                  icon={<XCircleIcon className="w-5 h-5" />}
                  circle
                  onClick={(): void => {
                    setNavOpen(false);
                  }}
                />
              </div>
            </div>

            {!nodes.length && (
              <span className="p-4 text-sm text-gray-400 dark:text-gray-600">
                No nodes discovered yet...
              </span>
            )}

            {nodes.map((node) => (
              <Tab
                onClick={(): void => {
                  setNavOpen(false);
                }}
                key={node.num}
              >
                {({ selected }): JSX.Element => (
                  <SidebarItem
                    title={node.user?.longName ?? node.num.toString()}
                    description={
                      node.user?.hwModel
                        ? Protobuf.HardwareModel[node.user.hwModel]
                        : 'Unknown Hardware'
                    }
                    selected={selected}
                    icon={
                      <Avatar
                        size={30}
                        name={node.user?.longName ?? node.num.toString()}
                        variant="beam"
                        colors={[
                          '#213435',
                          '#46685B',
                          '#648A64',
                          '#A6B985',
                          '#E1E3AC',
                        ]}
                      />
                    }
                  />
                )}
              </Tab>
            ))}
          </Tab.List>
        </Drawer>
        <div className="w-full">
          <Tab.Panels className="h-full">
            {nodes.map((node) => (
              <Tab.Panel className="h-full" key={node.num}>
                <Node navOpen={navOpen} setNavOpen={setNavOpen} node={node} />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </div>
      </div>
    </Tab.Group>
  );
};
