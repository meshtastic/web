import type React from 'react';

import { FaQrcode } from 'react-icons/fa';
import { FiCode, FiSave } from 'react-icons/fi';

import { CollapsibleSection } from '@app/components/layout/Sidebar/sections/CollapsibleSection';
import { useAppSelector } from '@app/hooks/useAppSelector';
import { IconButton } from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { SettingsPanel } from './SettingsPanel';

export const ChannelsGroup = (): JSX.Element => {
  const channels = useAppSelector((state) => state.meshtastic.radio.channels);

  return (
    <>
      {channels.map((channel) => {
        return (
          <div key={channel.index}>
            <CollapsibleSection
              title={
                channel.settings?.name.length
                  ? channel.settings.name
                  : channel.role === Protobuf.Channel_Role.PRIMARY
                  ? 'Primary'
                  : `Channel: ${channel.index}`
              }
              icon={
                <div
                  className={`h-3 w-3 rounded-full ${
                    channel.role === Protobuf.Channel_Role.PRIMARY
                      ? 'bg-orange-500'
                      : channel.role === Protobuf.Channel_Role.SECONDARY
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }`}
                />
              }
              actions={
                <>
                  <IconButton icon={<FiCode />} />
                  <IconButton icon={<FaQrcode />} />
                  <IconButton icon={<FiSave />} />
                </>
              }
            >
              <>
                {/* <DebugPanel channel={channel} /> */}
                {/* <QRCodePanel channel={channel} /> */}
                <SettingsPanel channel={channel} />
              </>
            </CollapsibleSection>
          </div>
        );
      })}
    </>
  );
};
