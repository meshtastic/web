import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Card } from '@app/components/generic/Card';
import { Toggle } from '@app/components/generic/Toggle';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Input } from '@components/generic/Input';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { MenuIcon, SaveIcon } from '@heroicons/react/outline';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface DeviceProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Device = ({ navOpen, setNavOpen }: DeviceProps): JSX.Element => {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.meshtastic.user);
  const { register, handleSubmit, formState } = useForm<{
    isLicensed: boolean;
    shortName: string;
    longName: string;
  }>({
    defaultValues: {
      isLicensed: user.isLicensed,
      shortName: user.shortName,
      longName: user.longName,
    },
  });

  const onSubmit = handleSubmit((data) => {
    Protobuf.User.mergePartial(user, data);
    void connection.setOwner(user);
  });

  return (
    <PrimaryTemplate
      title="Device"
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
          <form className="space-y-2" onSubmit={onSubmit}>
            <Input label={'Device Name'} {...register('longName')} />
            <Input
              label={'Short Name'}
              maxLength={3}
              {...register('shortName')}
            />
            <Toggle label="Licenced Operator?" {...register('isLicensed')} />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
