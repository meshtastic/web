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

import { CollapsibleSection } from '@app/components/layout/Sidebar/sections/CollapsibleSection';
import { ExternalSection } from '@app/components/layout/Sidebar/sections/ExternalSection';
import { SidebarOverlay } from '@app/components/layout/Sidebar/sections/SidebarOverlay';
import { Channels } from '@app/components/layout/Sidebar/Settings/Channels';
import { ExternalNotificationsSettingsPlanel } from '@app/components/layout/Sidebar/Settings/plugins/panels/ExternalNotifications/SettingsPlanel';
import { RangeTestSettingsPanel } from '@app/components/layout/Sidebar/Settings/plugins/panels/RangeTest/SettingsPanel';
import { SerialSettingsPanel } from '@app/components/layout/Sidebar/Settings/plugins/panels/Serial/SettingsPanel';
import { StoreForwardSettingsPanel } from '@app/components/layout/Sidebar/Settings/plugins/panels/StoreForward/SettingsPanel';
import { Position } from '@app/components/layout/Sidebar/Settings/Position';
import { Power } from '@app/components/layout/Sidebar/Settings/Power';
import { Radio } from '@app/components/layout/Sidebar/Settings/Radio';
import { User } from '@app/components/layout/Sidebar/Settings/User';
import { WiFi } from '@app/components/layout/Sidebar/Settings/WiFi';

import { Interface } from './Interface';
import { ChannelsGroup } from './radio/channels/panels/ChannelsGroup';

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
