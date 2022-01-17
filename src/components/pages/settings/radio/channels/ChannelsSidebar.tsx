import type React from 'react';

import { FaQrcode } from 'react-icons/fa';
import { FiCode, FiSliders } from 'react-icons/fi';

import { TabButton } from '@app/components/TabButton';
import { Sidebar } from '@components/generic/Sidebar';
import { Tab } from '@headlessui/react';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { DebugPanel } from './panels/DebugPanel';
import { QRCodePanel } from './panels/QRCodePanel';
import { SettingsPanel } from './panels/SettingsPanel';

export interface ChannelsSidebarProps {
  channel?: Protobuf.Channel;
  closeSidebar: () => void;
}

export const ChannelsSidebar = ({
  channel,
  closeSidebar,
}: ChannelsSidebarProps): JSX.Element => {
  return (
    <Sidebar
      title={
        channel
          ? channel.settings?.name.length
            ? channel.settings.name
            : `Channel: ${channel.index}`
          : 'Please select channel'
      }
      tagline={channel ? Protobuf.Channel_Role[channel.role] : '...'}
      closeSidebar={closeSidebar}
    >
      {channel && (
        <Tab.Group>
          <div className="shadow-md">
            <Tab.List className="flex justify-between border-b border-gray-300 dark:border-gray-600">
              <TabButton>
                <FiSliders />
              </TabButton>
              <TabButton>
                <FaQrcode />
              </TabButton>
              <TabButton>
                <FiCode />
              </TabButton>
            </Tab.List>
          </div>
          <Tab.Panels className="flex flex-grow overflow-y-auto bg-gray-100 dark:bg-primaryDark">
            <SettingsPanel channel={channel} />
            <QRCodePanel channel={channel} />
            <DebugPanel channel={channel} />
          </Tab.Panels>
        </Tab.Group>
      )}
    </Sidebar>
  );
};
