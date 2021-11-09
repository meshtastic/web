import React from 'react';

import { useTranslation } from 'react-i18next';
import { FiMenu, FiSave } from 'react-icons/fi';

import { Channel } from '@app/components/Channel.jsx';
import { Card } from '@app/components/generic/Card';
import { IconButton } from '@app/components/generic/IconButton.jsx';
import { connection } from '@app/core/connection.js';
import { useAppSelector } from '@app/hooks/redux.js';
import { Button } from '@components/generic/Button';
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
  const channels = useAppSelector((state) => state.meshtastic.channels);

  return (
    <PrimaryTemplate
      title="Channels"
      tagline="Settings"
      button={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
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
        <Card
          title="Manage Channels"
          description={
            <div className="flex space-x-2 truncate">
              <div className="w-3 h-3 my-auto bg-green-500 rounded-full" />
              &nbsp;- Primary
              <div className="w-3 h-3 my-auto rounded-full bg-cyan-500" />
              &nbsp;- Secondary
              <div className="w-3 h-3 my-auto bg-gray-400 rounded-full" />
              &nbsp;- Disabled
              <div className="w-3 h-3 my-auto rounded-full bg-amber-400" />
              &nbsp;- Admin
            </div>
          }
        >
          <div className="w-full max-w-3xl p-4 space-y-2 md:p-10 md:max-w-xl">
            {channels.map((channel) => (
              <Channel key={channel.index} channel={channel} />
            ))}

            <div className="flex space-x-52">
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
