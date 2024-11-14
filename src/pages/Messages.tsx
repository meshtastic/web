import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Protobuf, Types } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { getChannelName } from "@pages/Channels.tsx";
import { HashIcon, LockIcon, LockOpenIcon, WaypointsIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

export const MessagesPage = (): JSX.Element => {
  const { channels, nodes, hardware, messageStores, traceroutes, connection } =
    useDevice();
  const [chatType, setChatType] =
    useState<Types.PacketDestination>("broadcast");
  const [activeChat, setActiveChat] = useState<number>(
    Types.ChannelNumber.Primary,
  );
  const filteredNodes = Array.from(nodes.values()).filter(
    (n) => n.num !== hardware.myNodeNum,
  );
  const allChannels = Array.from(channels.values());
  const filteredChannels = allChannels.filter(
    (ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED,
  );
  const currentChannel = channels.get(activeChat);
  const { toast } = useToast();
  const node = nodes.get(activeChat);
  const nodeHex = node?.num ? numberToHexUnpadded(node.num) : "Unknown";

  const [isLoading, setIsLoading] = useState(false);

  const handleScroll = (event) => {
    if (!isLoading && activeChat && event.currentTarget.scrollTop < 10) {
      setIsLoading(true);

      const messageStore = messageStores[chatType].get(activeChat);

      messageStore.loadMessages();

      setIsLoading(false);
    }
  };

  return (
    <>
      <Sidebar>
        <SidebarSection label="Channels">
          {filteredChannels.map((channel) => (
            <SidebarButton
              key={channel.index}
              label={
                channel.settings?.name.length
                  ? channel.settings?.name
                  : channel.index === 0
                    ? "Primary"
                    : `Ch ${channel.index}`
              }
              active={activeChat === channel.index}
              onClick={() => {
                setChatType("broadcast");
                setActiveChat(channel.index);
              }}
              element={<HashIcon size={16} className="mr-2" />}
            />
          ))}
        </SidebarSection>
        <SidebarSection label="Nodes">
          {filteredNodes.map((node) => (
            <SidebarButton
              key={node.num}
              label={node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`}
              active={activeChat === node.num}
              onClick={() => {
                setChatType("direct");
                setActiveChat(node.num);
              }}
              element={<Hashicon size={20} value={node.num.toString()} />}
            />
          ))}
        </SidebarSection>
      </Sidebar>
      <div className="flex flex-col flex-grow">
        <PageLayout
          onScroll={handleScroll}
          label={`Messages: ${
            chatType === "broadcast" && currentChannel
              ? getChannelName(currentChannel)
              : chatType === "direct" && nodes.get(activeChat)
                ? nodes.get(activeChat)?.user?.longName ?? nodeHex
                : "Loading..."
          }`}
          actions={
            chatType === "direct"
              ? [
                  {
                    icon: nodes.get(activeChat)?.user?.publicKey.length
                      ? LockIcon
                      : LockOpenIcon,
                    iconClasses: nodes.get(activeChat)?.user?.publicKey.length
                      ? "text-green-600"
                      : "text-yellow-300",
                    async onClick() {
                      const targetNode = nodes.get(activeChat)?.num;
                      if (targetNode === undefined) return;
                      toast({
                        title: nodes.get(activeChat)?.user?.publicKey.length
                          ? "Chat is using PKI encryption."
                          : "Chat is using PSK encryption.",
                      });
                    },
                  },
                  {
                    icon: WaypointsIcon,
                    async onClick() {
                      const targetNode = nodes.get(activeChat)?.num;
                      if (targetNode === undefined) return;
                      toast({
                        title: "Sending Traceroute, please wait...",
                      });
                      await connection?.traceRoute(targetNode).then(() =>
                        toast({
                          title: "Traceroute sent.",
                        }),
                      );
                    },
                  },
                  {
                    icon: TrashIcon,
                    onClick() {
                      const targetNode = nodes.get(activeChat)?.num;
                      if (targetNode === undefined) return;
                      messageStores.direct.get(targetNode).clear()
                      toast({
                        title: "Message history cleared.",
                      });
                    }
                  },
                ]
              : [
                  {
                    icon: TrashIcon,
                    onClick() {
                      const targetChannel = channels.get(activeChat)?.index;
                      if (targetChannel === undefined) return;
                      messageStores.broadcast.get(targetChannel).clear()
                      toast({
                        title: "Message history cleared.",
                      });
                    }
                  },
                ]
          }
        >
          {allChannels.map(
            (channel) =>
              activeChat === channel.index && (
                <ChannelChat
                  key={channel.index}
                  to="broadcast"
                  messageStore={messageStores.broadcast.get(channel.index)}
                  channel={channel.index}
                />
              ),
          )}
          {filteredNodes.map(
            (node) =>
              activeChat === node.num && (
                <ChannelChat
                  key={node.num}
                  to={activeChat}
                  messageStore={messageStores.direct.get(node.num)}
                  channel={Types.ChannelNumber.Primary}
                  traceroutes={traceroutes.get(node.num)}
                />
              ),
          )}
        </PageLayout>
      </div>
    </>
  );
};
