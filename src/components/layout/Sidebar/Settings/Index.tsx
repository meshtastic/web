import React from 'react';

import {
  FiAlignLeft,
  FiBell,
  FiFastForward,
  FiLayers,
  FiLayout,
  FiMapPin,
  FiPackage,
  FiRadio,
  FiRss,
  FiUser,
  FiWifi,
  FiZap,
} from 'react-icons/fi';

import { CollapsibleSection } from '@components/generic/Sidebar/CollapsibleSection';
import { ExternalSection } from '@components/generic/Sidebar/ExternalSection';
import { SidebarOverlay } from '@components/generic/Sidebar/SidebarOverlay';
import { Channels } from '@components/layout/Sidebar/Settings/Channels';
import { ChannelsGroup } from '@components/layout/Sidebar/Settings/channels/ChannelsGroup';
import { Interface } from '@components/layout/Sidebar/Settings/Interface';
import { ExternalNotificationsSettingsPlanel } from '@components/layout/Sidebar/Settings/plugins/ExternalNotifications';
import { RangeTestSettingsPanel } from '@components/layout/Sidebar/Settings/plugins/RangeTest';
import { SerialSettingsPanel } from '@components/layout/Sidebar/Settings/plugins/Serial';
import { StoreForwardSettingsPanel } from '@components/layout/Sidebar/Settings/plugins/StoreForward';
import { Position } from '@components/layout/Sidebar/Settings/Position';
import { Power } from '@components/layout/Sidebar/Settings/Power';
import { Radio } from '@components/layout/Sidebar/Settings/Radio';
import { User } from '@components/layout/Sidebar/Settings/User';
import { WiFi } from '@components/layout/Sidebar/Settings/WiFi';

export interface SettingsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const Settings = ({ open, setOpen }: SettingsProps): JSX.Element => {
  const [pluginsOpen, setPluginsOpen] = React.useState(false);
  const [channelsOpen, setChannelsOpen] = React.useState(false);
  // const { hasGps, hasWifi } = useAppSelector((state) => state.meshtastic.radio.hardware);

  const hasGps = true;
  const hasWifi = true;

  return (
    <>
      <SidebarOverlay
        title="Settings"
        open={open}
        close={(): void => {
          setOpen(false);
        }}
        direction="y"
      >
        <CollapsibleSection icon={<FiWifi />} title="WiFi & MQTT">
          <WiFi />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiMapPin />} title="Position">
          <Position />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiUser />} title="User">
          <User />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiZap />} title="Power">
          <Power />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiRadio />} title="Radio">
          <Radio />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiLayers />} title="Primary Channel">
          <Channels />
        </CollapsibleSection>
        <ExternalSection
          onClick={(): void => {
            setChannelsOpen(true);
          }}
          icon={<FiLayers />}
          title="Channels"
        />
        <ExternalSection
          onClick={(): void => {
            setPluginsOpen(true);
          }}
          icon={<FiPackage />}
          title="Plugins"
        />
        <CollapsibleSection icon={<FiLayout />} title="Interface">
          <Interface />
        </CollapsibleSection>
      </SidebarOverlay>

      {/* Plugins */}
      <SidebarOverlay
        title="Plugins"
        open={pluginsOpen}
        close={(): void => {
          setPluginsOpen(false);
        }}
        direction="x"
      >
        <CollapsibleSection title="Range Test" icon={<FiRss />}>
          <RangeTestSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection title="External Notifications" icon={<FiBell />}>
          <ExternalNotificationsSettingsPlanel />
        </CollapsibleSection>
        <CollapsibleSection title="Serial" icon={<FiAlignLeft />}>
          <SerialSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection title="Store & Forward" icon={<FiFastForward />}>
          <StoreForwardSettingsPanel />
        </CollapsibleSection>
      </SidebarOverlay>
      {/* End Plugins */}

      {/* Channels */}
      <SidebarOverlay
        title="Channels"
        open={channelsOpen}
        close={(): void => {
          setChannelsOpen(false);
        }}
        direction="x"
      >
        <ChannelsGroup />
      </SidebarOverlay>
      {/* End Channels */}
    </>
  );
};
