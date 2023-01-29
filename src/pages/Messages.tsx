import { TabbedContent, TabType } from "@components/generic/TabbedContent.js";
import { ChannelChat } from "@components/PageComponents/Messages/ChannelChat.js";
import { useDevice } from "@core/providers/useDevice.js";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const MessagesPage = (): JSX.Element => {
  const { channels, setActivePage } = useDevice();

  const tabs: TabType[] = channels.map((channel) => {
    return {
      label: channel.config.settings?.name.length
        ? channel.config.settings?.name
        : channel.config.index === 0
        ? "Primary"
        : `Ch ${channel.config.index}`,
      element: () => <ChannelChat channel={channel} />,
      disabled: channel.config.role === Protobuf.Channel_Role.DISABLED
    };
  });

  return (
    <div className="flex h-full w-full flex-col">
      <TabbedContent
        tabs={tabs}
        actions={[
          {
            icon: <PencilIcon className="h-4" />,
            action: () => setActivePage("channels")
          }
        ]}
      />
    </div>
  );
};
