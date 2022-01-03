import React from 'react';

import {
  FiLayers,
  FiLayout,
  FiMapPin,
  FiRadio,
  FiUser,
  FiWifi,
  FiZap,
} from 'react-icons/fi';

import type { SidebarItemProps } from '@app/components/generic/SidebarItem';
import { PageLayout } from '@components/templates/PageLayout';

import { Channels } from './Channels';
import { Interface } from './Interface';
import { Position } from './Position';
import { Power } from './Power';
import { Radio } from './Radio';
import { User } from './User';
import { WiFi } from './WiFi';

export const Settings = (): JSX.Element => {
  // const { hasGps, hasWifi } = useAppSelector((state) => state.meshtastic.radio.hardware);

  const hasGps = true;
  const hasWifi = true;

  const panels: JSX.Element[] = [
    <User key={4} />,
    <Power key={5} />,
    <Radio key={6} />,
    <Channels key={8} />,
    <Interface key={7} />,
  ];

  const sidebarItems: SidebarItemProps[] = [
    {
      title: 'User',
      description: 'Device name and details',
      icon: <FiUser className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'Power',
      description: 'Power and sleep settings',
      icon: <FiZap className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'Radio',
      description: 'LoRa settings',
      icon: <FiRadio className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'Channels',
      description: 'Manage channels',
      icon: <FiLayers className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'Interface',
      description: 'Language and UI settings',
      icon: <FiLayout className="flex-shrink-0 w-6 h-6" />,
    },
  ];

  React.useEffect(() => {
    if (hasGps) {
      panels.unshift(<Position key={3} />);
      sidebarItems.unshift({
        title: 'Position',
        description: 'Position settings and flags',
        icon: <FiMapPin className="flex-shrink-0 w-6 h-6" />,
      });
    }
    if (hasWifi) {
      panels.unshift(<WiFi key={2} />);
      sidebarItems.unshift({
        title: 'WiFi',
        description: 'WiFi credentials and mode',
        icon: <FiWifi className="flex-shrink-0 w-6 h-6" />,
      });
    }

    console.log(panels);
  }, [hasGps, hasWifi]);

  return (
    <PageLayout title="Settings" sidebarItems={sidebarItems} panels={panels} />
  );
};
