import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Card } from '@app/components/generic/Card';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Input } from '@components/generic/Input';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { MenuIcon, SaveIcon } from '@heroicons/react/outline';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface RadioProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Radio = ({ navOpen, setNavOpen }: RadioProps): JSX.Element => {
  const { t } = useTranslation();
  const radioConfig = useAppSelector((state) => state.meshtastic.preferences);

  const { register, handleSubmit, formState } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: radioConfig,
    });

  const onSubmit = handleSubmit((data) => {
    void connection.setPreferences(data);
  });
  return (
    <PrimaryTemplate
      title="Radio"
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
            <Input label={t('strings.wifi_ssid')} {...register('wifiSsid')} />
            <Input
              type="password"
              label={t('strings.wifi_psk')}
              {...register('wifiPassword')}
            />
            <Input
              label={'Charge current'}
              disabled
              {...register('chargeCurrent')}
            />
            <Input
              label={'Last GPS Attempt'}
              disabled
              {...register('gpsAttemptTime')}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
