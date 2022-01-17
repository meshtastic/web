import type React from 'react';

import { FiCode, FiSliders } from 'react-icons/fi';

import { TabButton } from '@app/components/TabButton';
import type { Plugin } from '@app/pages/settings/Plugins';
import { Sidebar } from '@components/generic/Sidebar';
import { Tab } from '@headlessui/react';

import { ExternalNotificationsDebugPanel } from './panels/ExternalNotifications/DebugPanel';
import { ExternalNotificationsSettingsPlanel } from './panels/ExternalNotifications/SettingsPlanel';
import { RangeTestDebugPanel } from './panels/RangeTest/DebugPanel';
import { RangeTestSettingsPanel } from './panels/RangeTest/SettingsPanel';
import { SerialDebugPanel } from './panels/Serial/DebugPanel';
import { SerialSettingsPanel } from './panels/Serial/SettingsPanel';
import { StoreForwardDebugPanel } from './panels/StoreForward/DebugPanel';
import { StoreForwardSettingsPanel } from './panels/StoreForward/SettingsPanel';

export interface PluginsSidebarProps {
  plugin?: Plugin;
  closeSidebar: () => void;
}

export const PluginsSidebar = ({
  plugin,
  closeSidebar,
}: PluginsSidebarProps): JSX.Element => {
  return (
    <Sidebar
      title={plugin ?? 'Please select plugin'}
      tagline={plugin ? 'settings' : '...'}
      closeSidebar={closeSidebar}
    >
      {plugin && (
        <Tab.Group>
          <div className="shadow-md">
            <Tab.List className="flex justify-between border-b border-gray-300 dark:border-gray-600">
              <TabButton>
                <FiSliders />
              </TabButton>
              <TabButton>
                <FiCode />
              </TabButton>
            </Tab.List>
          </div>
          <Tab.Panels className="flex flex-grow overflow-y-auto bg-gray-100 dark:bg-primaryDark">
            {plugin === 'Range Test' && (
              <>
                <RangeTestSettingsPanel />
                <RangeTestDebugPanel />
              </>
            )}
            {plugin === 'External Notifications' && (
              <>
                <ExternalNotificationsSettingsPlanel />
                <ExternalNotificationsDebugPanel />
              </>
            )}
            {plugin === 'Serial' && (
              <>
                <SerialSettingsPanel />
                <SerialDebugPanel />
              </>
            )}
            {plugin === 'Store & Forward' && (
              <>
                <StoreForwardSettingsPanel />
                <StoreForwardDebugPanel />
              </>
            )}
          </Tab.Panels>
        </Tab.Group>
      )}
    </Sidebar>
  );
};
