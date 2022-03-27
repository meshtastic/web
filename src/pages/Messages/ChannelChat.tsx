import type React from 'react';

import { m } from 'framer-motion';
import { FiSettings } from 'react-icons/fi';
import { MdPublic } from 'react-icons/md';
import TimeAgo from 'timeago-react';

import { IconButton } from '@components/generic/button/IconButton';
import { Tooltip } from '@components/generic/Tooltip';
import { SidebarItem } from '@components/layout/Sidebar/SidebarItem';
import { Hashicon } from '@emeraldpay/hashicon-react';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface ChannelChatProps {
  channel: Protobuf.Channel;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export const ChannelChat = ({
  channel,
  selectedIndex,
  setSelectedIndex,
}: ChannelChatProps): JSX.Element => {
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  ).myNodeNum;
  const nodes = useAppSelector((state) => state.meshtastic.nodes).filter(
    (node) => node.num !== myNodeNum,
  );
  const chats = useAppSelector((state) => state.meshtastic.chats);
  const channels = useAppSelector(
    (state) => state.meshtastic.radio.channels,
  ).filter((ch) => ch.role !== Protobuf.Channel_Role.DISABLED);

  return (
    <SidebarItem
      key={channel.index}
      selected={channel.index === selectedIndex}
      setSelected={(): void => {
        setSelectedIndex(channel.index);
      }}
      actions={<IconButton nested icon={<FiSettings />} />}
    >
      <Tooltip
        content={
          channel.settings?.name.length
            ? channel.settings.name
            : `CH: ${channel.index}`
        }
      >
        <div className="flex h-8 w-8 rounded-full bg-gray-300 dark:bg-primaryDark dark:text-white">
          <div className="m-auto">
            {channel.role === Protobuf.Channel_Role.PRIMARY ? (
              <MdPublic />
            ) : (
              <p>
                {channel.settings?.name.length
                  ? channel.settings.name.substring(0, 3).toUpperCase()
                  : `CH: ${channel.index}`}
              </p>
            )}
          </div>
        </div>
      </Tooltip>
      {chats[channel.index]?.messages.length ? (
        <>
          <div className="mx-2 flex h-8">
            {[
              ...new Set(
                chats[channel.index]?.messages.flatMap(({ message }) => [
                  message.packet.from,
                ]),
              ),
            ]
              .sort()
              .map((nodeId) => {
                return (
                  <Tooltip
                    key={nodeId}
                    content={
                      nodes.find((node) => node.num === nodeId)?.user
                        ?.longName ?? 'UNK'
                    }
                  >
                    <div className="flex h-full">
                      <m.div
                        whileHover={{ scale: 1.1 }}
                        className="my-auto -ml-2"
                      >
                        <Hashicon value={nodeId.toString()} size={20} />
                      </m.div>
                    </div>
                  </Tooltip>
                );
              })}
          </div>
          <div className="my-auto ml-auto text-xs font-semibold dark:text-gray-400">
            {chats[channel.index].messages.length ? (
              <TimeAgo datetime={chats[channel.index].lastInterraction} />
            ) : (
              <div>No messages</div>
            )}
          </div>
        </>
      ) : (
        <div className="my-auto dark:text-white">No messages</div>
      )}
    </SidebarItem>
  );
};
