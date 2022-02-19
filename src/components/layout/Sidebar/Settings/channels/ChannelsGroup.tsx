import type React from 'react';

import { CollapsibleSection } from '@components/generic/Sidebar/CollapsibleSection';
import { SettingsPanel } from '@components/layout/Sidebar/Settings/channels/Channels';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

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
            >
              <SettingsPanel channel={channel} />
            </CollapsibleSection>
          </div>
        );
      })}
    </>
  );
};
