import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiSave, FiTrash } from 'react-icons/fi';

import { Card } from '@app/components/generic/Card';
import { Input } from '@app/components/generic/Input.jsx';
import { connection } from '@app/core/connection.js';
import { useAppSelector } from '@app/hooks/redux.js';
import { Button } from '@components/generic/Button';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface ChannelsProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Channels = ({
  navOpen,
  setNavOpen,
}: ChannelsProps): JSX.Element => {
  const { t } = useTranslation();
  const channels = useAppSelector((state) => state.meshtastic.channels);

  const { register, handleSubmit, formState } = useForm<{
    index: number;
    name: string;
  }>();

  const onSubmit = handleSubmit(async (data) => {
    const adminChannel = Protobuf.Channel.create({
      role: Protobuf.Channel_Role.SECONDARY,
      index: data.index,
      settings: {
        name: data.name,
      },
    });
    await connection.setChannel(adminChannel);
  });

  return (
    <PrimaryTemplate
      title="Interface"
      tagline="Settings"
      button={
        <Button
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen(!navOpen);
          }}
          circle
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<FiSave className="w-5 h-5" />}
          active
          border
        >
          {t('strings.save_changes')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Card
          title="Add Channel"
          description="Once a channel is changed and confirmed working, click `Confirm Config` to prevent reverting."
        >
          <div className="w-full max-w-3xl p-10 space-y-2 md:max-w-xl">
            <form className="space-y-2" onSubmit={onSubmit}>
              <Input
                label="Index"
                type="number"
                min={1}
                max={7}
                {...register('index', { valueAsNumber: true })}
              />
              <Input label="Name" {...register('name')} />
              <div className="flex space-x-2">
                <Button onClick={onSubmit} border>
                  Add Channel
                </Button>
                <Button onClick={onSubmit} border>
                  Confirm Config
                </Button>
              </div>
            </form>
          </div>
        </Card>
        <Card
          title="Basic settings"
          description="Device name and user parameters"
        >
          <div className="w-full max-w-3xl p-10 space-y-2 md:max-w-xl">
            {channels.map((channel) => (
              <div key={channel.index} className="flex flex-col space-y-2">
                <div className="flex items-center justify-between p-2 border rounded-3xl">
                  {Protobuf.Channel_Role[channel.role]}
                  {channel.settings?.name}
                  <Button
                    onClick={async (): Promise<void> => {
                      await connection.deleteChannel(channel.index);
                    }}
                    icon={<FiTrash />}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
