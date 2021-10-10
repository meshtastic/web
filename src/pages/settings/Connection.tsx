import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Card } from '@app/components/generic/Card';
import { Input } from '@app/components/generic/Input';
import { Tabs } from '@app/components/generic/Tabs';
import { Toggle } from '@app/components/generic/Toggle';
import { bleConnection, serialConnection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { LinkIcon, MenuIcon, SaveIcon } from '@heroicons/react/outline';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface ConnectionProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Connection = ({
  navOpen,
  setNavOpen,
}: ConnectionProps): JSX.Element => {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.meshtastic.user);

  const { register, handleSubmit, formState } = useForm<Protobuf.User>({
    defaultValues: user,
  });

  const onSubmit = handleSubmit((data) => {
    // void connection.setOwner(data);
  });

  return (
    <PrimaryTemplate
      title="Connection"
      tagline="Settings"
      button={
        <Button
          icon={<MenuIcon className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen(!navOpen);
          }}
          circle
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<SaveIcon className="w-5 h-5" />}
          disabled={!formState.isDirty}
          active
          border
        >
          {t('strings.save_changes')}
        </Button>
      }
    >
      <Card
        title="Basic settings"
        description="Device name and user parameters"
      >
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <div className="flex w-full p-2 mb-2 border dark:border-gray-600 rounded-3xl">
            Current connection method:
            <div className="px-1 my-auto ml-2 text-sm bg-gray-400 rounded-full dark:bg-primaryDark">
              BLE
            </div>
          </div>
          <form className="space-y-2" onSubmit={onSubmit}>
            <Tabs
              className="mb-10 h-60"
              tabs={[
                {
                  name: 'HTTP',
                  body: (
                    <div className="space-y-2">
                      <Input label={'Device URL'} />
                      <Toggle label="Use TLS?" />
                    </div>
                  ),
                },
                {
                  name: 'Bluetooth',
                  body: (
                    <div className="space-y-2">
                      Devices:
                      <Button
                        onClick={async (): Promise<void> => {
                          console.log(await bleConnection.getDevices());
                        }}
                      >
                        Get Devices
                      </Button>
                      <div className="flex justify-between p-2 border rounded-3xl dark:border-600">
                        Device Name
                        <LinkIcon className="w-5 h-5 my-auto mr-2 text-gray-300" />
                      </div>
                      <div className="flex justify-between p-2 border rounded-3xl dark:border-600">
                        Device Name
                        <LinkIcon className="w-5 h-5 my-auto mr-2 text-gray-600" />
                      </div>
                    </div>
                  ),
                },
                {
                  name: 'Serial',
                  body: (
                    <div className="space-y-2">
                      Devices:
                      <Button
                        onClick={async (): Promise<void> => {
                          console.log(await serialConnection.getPorts());
                        }}
                      >
                        Get Devices
                      </Button>
                      <div className="flex justify-between p-2 border rounded-3xl dark:border-600">
                        Device Name
                        <LinkIcon className="w-5 h-5 my-auto mr-2 text-gray-300" />
                      </div>
                      <div className="flex justify-between p-2 border rounded-3xl dark:border-600">
                        Device Name
                        <LinkIcon className="w-5 h-5 my-auto mr-2 text-gray-600" />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
