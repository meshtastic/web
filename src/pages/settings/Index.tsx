import React from 'react';

import {
  FiLayers,
  FiLayout,
  FiLink2,
  FiRss,
  FiSmartphone,
} from 'react-icons/fi';

import { PageLayout } from '@components/templates/PageLayout';

import { Channels } from './Channels';
import { Connection } from './Connection';
import { Device } from './Device';
import { Interface } from './Interface';
import { Radio } from './Radio';

export const Settings = (): JSX.Element => {
  return (
    <PageLayout
      title="Settings"
      sidebarItems={[
        {
          title: 'Connection',
          description: 'Method and peramaters for connecting to the device',
          icon: <FiLink2 className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'Device',
          description: 'Device settings, such as device name and wifi settings',
          icon: <FiSmartphone className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'Radio',
          description: 'Adjust radio power and frequency settings',
          icon: <FiRss className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'Interface',
          description: 'Change language and other UI settings',
          icon: <FiLayout className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'Channels',
          description: 'Manage channels',
          icon: <FiLayers className="flex-shrink-0 w-6 h-6" />,
        },
      ]}
      panels={[
        <Connection key={1} />,
        <Device key={2} />,
        <Radio key={3} />,
        <Interface key={4} />,
        <Channels key={5} />,
      ]}
    />
  );
};
