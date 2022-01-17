import React from 'react';

import {
  FiAlignLeft,
  FiBell,
  FiExternalLink,
  FiFastForward,
  FiMenu,
  FiRss,
} from 'react-icons/fi';

import { PluginsSidebar } from '@app/components/pages/settings/plugins/PluginsSidebar';
import { useAppSelector } from '@app/hooks/useAppSelector';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Button, Card, IconButton } from '@meshtastic/components';

export type Plugin =
  | 'Range Test'
  | 'External Notifications'
  | 'Serial'
  | 'Store & Forward';

export interface PluginsProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Plugins = ({ navOpen, setNavOpen }: PluginsProps): JSX.Element => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [selectedPlugin, setSelectedPlugin] = React.useState<
    Plugin | undefined
  >();
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const plugins: {
    name: Plugin;
    description: string;
    enabled: boolean;
    icon: JSX.Element;
  }[] = [
    {
      name: 'Range Test',
      description: 'Test the range of your Meshtastic node',
      enabled: preferences.rangeTestPluginEnabled,
      icon: <FiRss />,
    },
    {
      name: 'External Notifications',
      description: 'External hardware alerts',
      enabled: preferences.extNotificationPluginEnabled,
      icon: <FiBell />,
    },
    {
      name: 'Serial',
      description: 'Send serial data over the mesh',
      enabled: preferences.serialpluginEnabled,
      icon: <FiAlignLeft />,
    },
    {
      name: 'Store & Forward',
      description: 'Retrive message history',
      enabled: preferences.storeForwardPluginEnabled,
      icon: <FiFastForward />,
    },
  ];

  return (
    <>
      <PrimaryTemplate
        title="Plugins"
        tagline="Settings"
        leftButton={
          <Button
            icon={<FiMenu className="w-5 h-5" />}
            onClick={(): void => {
              setNavOpen && setNavOpen(!navOpen);
            }}
          />
        }
      >
        <Card
          title="Basic settings"
          description="Device name and user parameters"
        >
          <div className="w-full max-w-3xl p-10 space-y-2 md:max-w-xl">
            {plugins.map((plugin, index) => (
              <div
                key={index}
                onClick={(): void => {
                  setSelectedPlugin(plugin.name);
                  setSidebarOpen(true);
                }}
                className={`flex justify-between p-2 border border-gray-300 dark:border-gray-600 bg-gray-100 rounded-md dark:bg-secondaryDark shadow-md ${
                  selectedPlugin === plugin.name
                    ? 'border-primary dark:border-primary'
                    : ''
                }`}
              >
                <div className="flex my-auto space-x-2">
                  <div
                    className={`h-3 my-auto w-3 rounded-full ${
                      plugin.enabled ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex gap-2">
                    <div className="my-auto">{plugin.icon}</div>
                    {plugin.name}
                  </div>
                </div>
                <div className="flex gap-2">
                  <IconButton active icon={<FiExternalLink />} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PrimaryTemplate>
      {sidebarOpen && (
        <PluginsSidebar
          closeSidebar={(): void => {
            setSidebarOpen(false);
          }}
          plugin={selectedPlugin}
        />
      )}
    </>
  );
};
