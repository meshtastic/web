import React from 'react';

import { FiFileText, FiRss } from 'react-icons/fi';

import { PageLayout } from '@components/templates/PageLayout';

import { Files } from './Files';
import { RangeTest } from './RangeTest';

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
      ]}
      panels={[<RangeTest key={1} />, <Files key={2} />]}
    />
  );
};
