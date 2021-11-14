import React from 'react';

import { useTranslation } from 'react-i18next';
import { FiCode, FiMenu, FiSave } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Channel } from '@components/Channel';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';

export interface ChannelsProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Channels = ({
  navOpen,
  setNavOpen,
}: ChannelsProps): JSX.Element => {
  const { t } = useTranslation();
  const channels = useAppSelector((state) => state.meshtastic.channels).filter(
    (channel) => channel.index !== 0,
  );
  const [debug, setDebug] = React.useState(false);

  return (
    <PrimaryTemplate
      title="Channels"
      tagline="Settings"
      leftButton={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
      rightButton={
        <IconButton
          icon={<FiCode className="w-5 h-5" />}
          active={debug}
          onClick={(): void => {
            setDebug(!debug);
          }}
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<FiSave className="w-5 h-5" />}
          active
          border
        >
          Confirm
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <Cover enabled={debug} content={<JSONPretty data={channels} />} />
          <div className="w-full p-4 space-y-2 md:p-10">
            {channels.map((channel) => (
              <Channel key={channel.index} channel={channel} />
            ))}

            <div className="flex justify-between">
              <div
                onClick={(): Promise<void> => {
                  return connection.confirmSetChannel();
                }}
                className="text-sm font-thin text-gray-400 dark:text-gray-300"
              >
                Please ensure any changes are working before confirming
              </div>
              <Button active>Confirm</Button>
            </div>
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
