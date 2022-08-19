import type React from "react";

import {
  CircleIcon,
  EditIcon,
  IconButton,
  Pane,
  RingIcon,
  Tooltip,
} from "evergreen-ui";

import {
  TabbedContent,
  TabType,
} from "@components/layout/page/TabbedContent.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

import { ChannelChat } from "./ChannelChat.js";

export const MessagesPage = (): JSX.Element => {
  const { channels, setActivePage } = useDevice();

  const tabs: TabType[] = channels.map((channel) => {
    return {
      name: channel.config.settings?.name.length
        ? channel.config.settings?.name
        : channel.config.index === 0
        ? "Primary"
        : `Ch ${channel.config.index}`,
      icon: channel.messages.length ? RingIcon : CircleIcon,
      element: () => <ChannelChat channel={channel} />,
      disabled: channel.config.role === Protobuf.Channel_Role.DISABLED,
    };
  });

  return (
    <Pane display="flex" flexDirection="column" width="100%">
      <TabbedContent
        tabs={tabs}
        actions={[
          () => (
            <Tooltip content="Edit Channels">
              <IconButton
                icon={EditIcon}
                onClick={() => {
                  setActivePage("channels");
                }}
              />
            </Tooltip>
          ),
        ]}
      />
    </Pane>
  );
};
