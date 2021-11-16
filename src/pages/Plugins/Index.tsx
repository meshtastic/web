import type React from 'react';

import { FiAlignLeft, FiBell, FiFileText, FiRss } from 'react-icons/fi';

import { PageLayout } from '@components/templates/PageLayout';

import { ExternalNotification } from './ExternalNotification';
import { Files } from './Files';
import { RangeTest } from './RangeTest';
import { Serial } from './Serial';

export const Plugins = (): JSX.Element => {
  return (
    <PageLayout
      title="Plugins"
      sidebarItems={[
        {
          title: 'Range Test',
          description: 'Test the range of your Meshtastic node',
          icon: <FiRss className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'File Browser',
          description: 'HTTP only file browser',
          icon: <FiFileText className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'External Notification',
          description: 'External hardware alerts',
          icon: <FiBell className="flex-shrink-0 w-6 h-6" />,
        },
        {
          title: 'Serial',
          description: 'Send serial data over the mesh',
          icon: <FiAlignLeft className="flex-shrink-0 w-6 h-6" />,
        },
      ]}
      panels={[
        <RangeTest key={1} />,
        <Files key={2} />,
        <ExternalNotification key={3} />,
        <Serial key={4} />,
      ]}
    />
  );
};
