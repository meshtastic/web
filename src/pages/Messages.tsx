import { Avatar } from "@app/components/UI/Avatar";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import { Protobuf, Types } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { getChannelName } from "@pages/Channels.tsx";
import { HashIcon, LockIcon, LockOpenIcon, WaypointsIcon } from "lucide-react";
import { type JSX, useState } from "react";

export const MessagesPage = (): JSX.Element => {
  const { channels, nodes, hardware, messages, traceroutes, connection } =
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
        <SidebarSection label="Nodes" className="flex flex-col gap-4">
          {filteredNodes.map((node) => (
            <SidebarButton
              key={node.num}
              label={node.user?.longName ?? `!${numberToHexUnpadded(node.num)}`}
              active={activeChat === node.num}
              onClick={() => {
                setChatType("direct");
                setActiveChat(node.num);
              }}
              element={
                <Avatar
                  text={node.user?.shortName.toString() ?? node.num.toString()}
                />
              }
            />
          ))}
        </SidebarSection>
      </Sidebar>
      <div className="flex flex-col flex-grow">
        <PageLayout
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
                ]
              : []
          }
        >
          {allChannels.map(
            (channel) =>
              activeChat === channel.index && (
                <ChannelChat
                  key={channel.index}
                  to="broadcast"
                  messages={messages.broadcast.get(channel.index)}
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
                  messages={messages.direct.get(node.num)}
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
