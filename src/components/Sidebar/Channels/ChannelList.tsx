import React from 'react';

import { Protobuf } from '@meshtastic/meshtasticjs';

import { useAppSelector } from '../../../hooks/redux';
import { Channel } from './Channel';

export const ChannelList = (): JSX.Element => {
  const channels = useAppSelector((state) => state.meshtastic.channels);

  return (
    <>
      {channels.map((channel, index) => {
        if (channel.role !== Protobuf.Channel_Role.DISABLED)
          return <Channel key={index} channel={channel} />;
      })}
    </>
  );
};
