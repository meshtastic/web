import React from 'react';

import { useObservableSuspense } from 'observable-hooks';

import { Protobuf } from '@meshtastic/meshtasticjs';

import { channelResource } from '../../../streams';
import { Channel } from './Channel';

export const ChannelList = (): JSX.Element => {
  const channelSource = useObservableSuspense(channelResource);

  const [channels, setChannels] = React.useState<Protobuf.Channel[]>([]);

  React.useEffect(() => {
    if (
      channels.findIndex(
        (currentChannel) => currentChannel.index === channelSource.index,
      ) >= 0
    ) {
      setChannels(
        channels.map((currentChannel) =>
          currentChannel.index === channelSource.index
            ? channelSource
            : currentChannel,
        ),
      );
    } else {
      setChannels((channels) => [...channels, channelSource]);
    }
  }, [channelSource, channels]);

  return (
    <>
      {channels.map((channel, index) => {
        if (channel.role !== Protobuf.Channel_Role.DISABLED)
          return <Channel key={index} channel={channel} />;
      })}
    </>
  );
};
