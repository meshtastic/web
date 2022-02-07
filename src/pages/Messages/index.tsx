import React from 'react';

import { m } from 'framer-motion';
import { FiHash, FiMessageCircle, FiSettings } from 'react-icons/fi';
import { MdPublic } from 'react-icons/md';
import TimeAgo from 'timeago-react';

import { Layout } from '@app/components/layout';
import { SidebarItem } from '@components/layout/Sidebar/SidebarItem';
import { useAppSelector } from '@hooks/useAppSelector';
import { IconButton, Tooltip } from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';
// eslint-disable-next-line import/no-unresolved
import skypack_hashicon from '@skypack/@emeraldpay/hashicon-react';

import { Message } from './Message';
import { MessageBar } from './MessageBar';

const Hashicon = skypack_hashicon.Hashicon;

export const Messages = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const channels = useAppSelector(
    (state) => state.meshtastic.radio.channels,
  ).filter((ch) => ch.channel.role !== Protobuf.Channel_Role.DISABLED);
  const [channelIndex, setChannelIndex] = React.useState(0);
  const chatRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [channels]);

  return (
    <Layout
      title="Message Groups"
      icon={<FiMessageCircle />}
      sidebarContents={
        <div className="flex flex-col gap-2">
          {channels.map((channel) => (
            <SidebarItem
              key={channel.channel.index}
              selected={channelIndex === channel.channel.index}
              setSelected={(): void => {
                setChannelIndex(channel.channel.index);
              }}
              actions={<IconButton icon={<FiSettings />} />}
            >
              <div className="flex h-8 w-8 rounded-full bg-gray-200 dark:bg-primaryDark dark:text-white">
                <div className="m-auto">
                  {channel.channel.role === Protobuf.Channel_Role.PRIMARY ? (
                    <MdPublic />
                  ) : (
                    <p>
                      {channel.channel.settings?.name.length
                        ? channel.channel.settings.name
                            .substring(0, 3)
                            .toUpperCase()
                        : `CH: ${channel.channel.index}`}
                    </p>
                  )}
                </div>
              </div>
              {channel.messages.length ? (
                <>
                  <div className="mx-2 flex h-8">
                    {[
                      ...new Set(
                        channel.messages.flatMap(({ message }) => [
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
                              nodes.find((node) => node.number === nodeId)?.user
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
                  <TimeAgo
                    className="my-auto ml-auto text-xs font-semibold dark:text-gray-400"
                    datetime={channel.lastChatInterraction}
                  />
                </>
              ) : (
                <div className="my-auto dark:text-white">No messages</div>
              )}
            </SidebarItem>
          ))}
        </div>
      }
    >
      <div className="flex w-full flex-col">
        <div className="flex w-full justify-between border-b border-gray-300 px-2 dark:border-gray-600 dark:text-gray-300">
          <div className="my-auto flex gap-2 py-2 text-sm">
            <IconButton icon={<FiHash className="h-4 w-4" />} />
            <div className="my-auto">
              {channels[channelIndex]?.channel.settings?.name.length
                ? channels[channelIndex]?.channel.settings?.name
                : channels[channelIndex]?.channel.role ===
                  Protobuf.Channel_Role.PRIMARY
                ? 'Primary'
                : `Channel: ${channels[channelIndex]?.channel.index}`}
            </div>
          </div>
        </div>
        <div
          ref={chatRef}
          className="flex flex-grow flex-col space-y-2 overflow-y-auto border-b border-gray-300 bg-white pb-6 dark:border-gray-600 dark:bg-secondaryDark"
        >
          <div className="mt-auto">
            {channels[channelIndex]?.messages.map((message, index) => (
              <Message
                key={index}
                message={message.message.data}
                ack={message.ack}
                rxTime={message.received}
                lastMsgSameUser={
                  index === 0
                    ? false
                    : channels[channelIndex]?.messages[index - 1].message.packet
                        .from === message.message.packet.from
                }
                sender={nodes.find(
                  (node) => node.number === message.message.packet.from,
                )}
              />
            ))}
          </div>
        </div>
        <MessageBar channelIndex={channelIndex} />
      </div>
    </Layout>
  );
};
