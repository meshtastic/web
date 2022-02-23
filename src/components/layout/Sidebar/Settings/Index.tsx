import type React from 'react';
import { useState } from 'react';

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

import { useAppSelector } from '@app/hooks/useAppSelector.js';
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
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const {
    rangeTestPluginEnabled,
    extNotificationPluginEnabled,
    serialpluginEnabled,
    storeForwardPluginEnabled,
  } = useAppSelector((state) => state.meshtastic.radio.preferences);

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
        <CollapsibleSection
          title="Range Test"
          icon={
            <div className="flex gap-2">
              <FiRss />
              <div
                className={`h-3 w-3 rounded-full ${
                  rangeTestPluginEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          }
        >
          <RangeTestSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection
          title="External Notifications"
          icon={
            <div className="flex gap-2">
              <FiBell />
              <div
                className={`h-3 w-3 rounded-full ${
                  extNotificationPluginEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          }
        >
          <ExternalNotificationsSettingsPlanel />
        </CollapsibleSection>
        <CollapsibleSection
          title="Serial"
          icon={
            <div className="flex gap-2">
              <FiAlignLeft />
              <div
                className={`h-3 w-3 rounded-full ${
                  serialpluginEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          }
        >
          <SerialSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection
          title="Store & Forward"
          icon={
            <div className="flex gap-2">
              <FiFastForward />
              <div
                className={`h-3 w-3 rounded-full ${
                  storeForwardPluginEnabled ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          }
        >
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
