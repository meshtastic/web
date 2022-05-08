import type React from 'react';
import { useState } from 'react';

import {
  FiActivity,
  FiAlignLeft,
  FiBell,
  FiFastForward,
  FiLayers,
  FiLayout,
  FiMapPin,
  FiMessageSquare,
  FiPackage,
  FiPower,
  FiRss,
  FiSmartphone,
  FiTv,
  FiUser,
  FiWifi,
} from 'react-icons/fi';

import { CollapsibleSection } from '@components/generic/Sidebar/CollapsibleSection';
import { ExternalSection } from '@components/generic/Sidebar/ExternalSection';
import { SidebarOverlay } from '@components/generic/Sidebar/SidebarOverlay';
import { ChannelsGroup } from '@components/layout/Sidebar/Settings/channels/ChannelsGroup';
import { Display } from '@components/layout/Sidebar/Settings/Display';
import { Position } from '@app/components/layout/Sidebar/Settings/Position';
import { Interface } from '@components/layout/Sidebar/Settings/Interface';
import { LoRa } from '@components/layout/Sidebar/Settings/LoRa';
import { CannedMessage } from '@components/layout/Sidebar/Settings/modules/CannedMessage';
import { ExternalNotificationsSettingsPlanel } from '@components/layout/Sidebar/Settings/modules/ExternalNotifications';
import { MQTT } from '@components/layout/Sidebar/Settings/modules/MQTT';
import { RangeTestSettingsPanel } from '@components/layout/Sidebar/Settings/modules/RangeTest';
import { SerialSettingsPanel } from '@components/layout/Sidebar/Settings/modules/Serial';
import { StoreForwardSettingsPanel } from '@components/layout/Sidebar/Settings/modules/StoreForward';
import { Telemetry } from '@components/layout/Sidebar/Settings/modules/Telemetry';
import { Power } from '@components/layout/Sidebar/Settings/Power';
import { User } from '@components/layout/Sidebar/Settings/User';
import { WiFi } from '@components/layout/Sidebar/Settings/WiFi';
import { useAppSelector } from '@hooks/useAppSelector';

export interface SettingsProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const Settings = ({ open, setOpen }: SettingsProps): JSX.Element => {
  const [modulesOpen, setModulesOpen] = useState(false);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const moduleConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig,
  );

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
        <CollapsibleSection icon={<FiUser />} title="User">
          <User />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiSmartphone />} title="Device">
          <WiFi />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiMapPin />} title="Position">
          <Position />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiPower />} title="Power">
          <Power />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiWifi />} title="WiFi">
          <WiFi />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiTv />} title="Display">
          <Display />
        </CollapsibleSection>
        <CollapsibleSection icon={<FiRss />} title="LoRa">
          <LoRa />
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
            setModulesOpen(true);
          }}
          icon={<FiPackage />}
          title="Modules"
        />
        <CollapsibleSection icon={<FiLayout />} title="Interface">
          <Interface />
        </CollapsibleSection>
      </SidebarOverlay>

      {/* Modules */}
      <SidebarOverlay
        title="Modules"
        open={modulesOpen}
        close={(): void => {
          setModulesOpen(false);
        }}
        direction="x"
      >
        <CollapsibleSection
          icon={<FiWifi />}
          title="MQTT"
          status={!moduleConfig.mqtt.disabled}
        >
          <MQTT />
        </CollapsibleSection>
        <CollapsibleSection
          icon={<FiAlignLeft />}
          title="Serial"
          status={moduleConfig.serial.enabled}
        >
          <SerialSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection
          icon={<FiBell />}
          title="External Notifications"
          status={moduleConfig.extNotification.enabled}
        >
          <ExternalNotificationsSettingsPlanel />
        </CollapsibleSection>
        <CollapsibleSection
          icon={<FiFastForward />}
          title="Store & Forward"
          status={moduleConfig.storeForward.enabled}
        >
          <StoreForwardSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection
          icon={<FiRss />}
          title="Range Test"
          status={moduleConfig.rangeTest.enabled}
        >
          <RangeTestSettingsPanel />
        </CollapsibleSection>
        <CollapsibleSection
          icon={<FiActivity />}
          title="Telemetry"
          status={true}
        >
          <Telemetry />
        </CollapsibleSection>
        <CollapsibleSection
          icon={<FiMessageSquare />}
          title="Canned Message"
          status={moduleConfig.cannedMessage.enabled}
        >
          <CannedMessage />
        </CollapsibleSection>
      </SidebarOverlay>
      {/* End Modules */}

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
