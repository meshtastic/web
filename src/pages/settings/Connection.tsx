import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Input } from '@app/components/generic/Input';
import { Tabs } from '@app/components/generic/Tabs';
import { Toggle } from '@app/components/generic/Toggle';
import {
  bleConnection,
  connection,
  serialConnection,
} from '@app/core/connection';
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
    void connection.setOwner(data);
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
      <div className="w-full max-w-3xl md:max-w-xl">
        <div className="mb-2 flex w-full border dark:border-gray-600 rounded-3xl p-2">
          Current connection method:
          <div className="ml-2 rounded-full bg-gray-400 dark:bg-primaryDark text-sm px-1 my-auto">
            BLE
          </div>
        </div>
        <form className="space-y-2" onSubmit={onSubmit}>
          <Tabs
            className="h-60"
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
                    <div className="flex justify-between rounded-3xl border dark:border-600 p-2">
                      Device Name
                      <LinkIcon className="my-auto mr-2 w-5 h-5 text-gray-300" />
                    </div>
                    <div className="flex justify-between rounded-3xl border dark:border-600 p-2">
                      Device Name
                      <LinkIcon className="my-auto mr-2 w-5 h-5 text-gray-600" />
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
                    <div className="flex justify-between rounded-3xl border dark:border-600 p-2">
                      Device Name
                      <LinkIcon className="my-auto mr-2 w-5 h-5 text-gray-300" />
                    </div>
                    <div className="flex justify-between rounded-3xl border dark:border-600 p-2">
                      Device Name
                      <LinkIcon className="my-auto mr-2 w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </form>
      </div>
    </PrimaryTemplate>
  );
};
