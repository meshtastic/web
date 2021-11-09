import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiSave } from 'react-icons/fi';

import { Card } from '@app/components/generic/Card';
import { Checkbox } from '@app/components/generic/form/Checkbox';
import { IconButton } from '@app/components/generic/IconButton.jsx';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Input } from '@components/generic/form/Input';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface DeviceProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Device = ({ navOpen, setNavOpen }: DeviceProps): JSX.Element => {
  const { t } = useTranslation();
  const user = useAppSelector((state) => state.meshtastic.user);
  const { register, handleSubmit, formState } = useForm<{
    longName: string;
    shortName: string;
    isLicensed: boolean;
  }>({
    defaultValues: {
      longName: user.longName,
      shortName: user.shortName,
      isLicensed: user.isLicensed,
    },
  });

  const onSubmit = handleSubmit((data) => {
    void connection.setOwner({ ...user, ...data });
  });

  return (
    <PrimaryTemplate
      title="Device"
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
          disabled={!formState.isDirty}
          onClick={onSubmit}
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
            <Input label={'Device ID'} value={user.id} disabled />
            <Input
              label={'Hardware'}
              value={Protobuf.HardwareModel[user.hwModel]}
              disabled
            />
            <Input label={'Device Name'} {...register('longName')} />
            <Input
              label={'Short Name'}
              maxLength={3}
              {...register('shortName')}
            />
            <Checkbox label="Licenced Operator?" {...register('isLicensed')} />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
