import React from 'react';

import {
  FiCheck,
  FiClipboard,
  FiCode,
  FiMapPin,
  FiSliders,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { IoTelescope } from 'react-icons/io5';
import JSONPretty from 'react-json-pretty';
import useCopyClipboard from 'react-use-clipboard';

import { TabButton } from '@app/components/TabButton';
import type { Node } from '@app/core/slices/meshtasticSlice';
import { Tab } from '@headlessui/react';
import { IconButton } from '@meshtastic/components';

export interface SidebarProps {
  node: Node;
  closeSidebar: () => void;
}

export const Sidebar = ({ node, closeSidebar }: SidebarProps): JSX.Element => {
  const [toCopy, setToCopy] = React.useState<string>('');
  const [isCopied, setCopied] = useCopyClipboard(toCopy, {
    successDuration: 1000,
  });

  return (
    <div className="h-full bg-white border-l border-gray-300 dark:border-gray-600 w-96 dark:bg-secondaryDark">
      <Tab.Group>
        <div className="shadow-md">
          <div className="p-2">
            <div className="flex justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-400">
                  {node.number}
                </h3>
                <h1 className="text-lg font-medium truncate">
                  {node.user?.longName}({node.user?.shortName})
                </h1>
              </div>
              <div className="mb-auto">
                <IconButton
                  onClick={(): void => {
                    closeSidebar();
                  }}
                  icon={<FiX />}
                />
              </div>
            </div>
          </div>

          <Tab.List className="flex justify-between border-b border-gray-300 dark:border-gray-600">
            <TabButton>
              <FiUser />
            </TabButton>
            <TabButton>
              <FiMapPin />
            </TabButton>
            <TabButton>
              <IoTelescope />
            </TabButton>
            <TabButton>
              <FiSliders />
            </TabButton>
            <TabButton>
              <FiCode />
            </TabButton>
          </Tab.List>
        </div>
        <Tab.Panels className="h-full bg-gray-100 dark:bg-primaryDark">
          <Tab.Panel>Content 1</Tab.Panel>
          <Tab.Panel>
            <div></div>
          </Tab.Panel>
          <Tab.Panel>Content 3</Tab.Panel>
          <Tab.Panel>Remote Administration</Tab.Panel>
          <Tab.Panel className="relative">
            <div className="absolute right-0 m-2">
              <IconButton
                onClick={(): void => {
                  setToCopy(JSON.stringify(node));
                  setCopied();
                }}
                icon={isCopied ? <FiCheck /> : <FiClipboard />}
              />
            </div>
            <JSONPretty data={node} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};
