import type React from 'react';

import {
  FiLayers,
  FiLayout,
  FiLink2,
  FiMapPin,
  FiRadio,
  FiUser,
  FiWifi,
  FiZap,
} from 'react-icons/fi';

import { PageLayout } from '@components/templates/PageLayout';

import { Channels } from './Channels';
import { Connection } from './Connection';
import { Interface } from './Interface';
import { Position } from './Position';
import { Power } from './Power';
import { Radio } from './Radio';
import { User } from './User';
import { WiFi } from './WiFi';

export const Settings = (): JSX.Element => {
  const sidebarItems = [
    {
      title: 'Connection',
      description: 'Connection method and parameters',
      icon: <FiLink2 className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'WiFi',
      description: 'WiFi credentials and mode',
      icon: <FiWifi className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'Position',
      description: 'Position settings and flags',
      icon: <FiMapPin className="flex-shrink-0 w-6 h-6" />,
    },
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
      title: 'Interface',
      description: 'Language and UI settings',
      icon: <FiLayout className="flex-shrink-0 w-6 h-6" />,
    },
    {
      title: 'Channels',
      description: 'Manage channels',
      icon: <FiLayers className="flex-shrink-0 w-6 h-6" />,
    },
  ];
  return (
    <PageLayout
      title="Settings"
      sidebarItems={sidebarItems}
      panels={[
        <Connection key={1} />,
        <WiFi key={2} />,
        <Position key={3} />,
        <User key={4} />,
        <Power key={5} />,
        <Radio key={6} />,
        <Interface key={7} />,
        <Channels key={8} />,
      ]}
    />
  );
};
