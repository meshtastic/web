import React from 'react';

import { FiCode, FiMapPin, FiSliders, FiUser } from 'react-icons/fi';
import { IoTelescope } from 'react-icons/io5';

import { DebugPanel } from '@app/components/pages/nodes/panels/DebugPanel';
import { InfoPanel } from '@app/components/pages/nodes/panels/InfoPanel';
import { PositionPanel } from '@app/components/pages/nodes/panels/PositionPanel';
import { Sidebar } from '@components/generic/Sidebar';
import { TabButton } from '@components/TabButton';
import type { Node } from '@core/slices/meshtasticSlice';
import { Tab } from '@headlessui/react';

export interface NodeSidebarProps {
  node: Node;
  closeSidebar: () => void;
}

export const NodeSidebar = ({
  node,
  closeSidebar,
}: NodeSidebarProps): JSX.Element => {
  return (
    <Sidebar
      title={node.number.toString()}
      tagline={`${node.user?.longName}(${node.user?.shortName})`}
      closeSidebar={closeSidebar}
    >
      <Tab.Group>
        <div className="shadow-md">
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
        <Tab.Panels className="flex-grow overflow-y-auto bg-gray-100 dark:bg-primaryDark">
          <InfoPanel />
          <PositionPanel node={node} />
          <Tab.Panel className="p-2">Content 3</Tab.Panel>
          <Tab.Panel className="p-2">Remote Administration</Tab.Panel>
          <DebugPanel node={node} />
        </Tab.Panels>
      </Tab.Group>
    </Sidebar>
  );
};
