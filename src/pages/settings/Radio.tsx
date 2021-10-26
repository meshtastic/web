import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiSave, FiXCircle } from 'react-icons/fi';

import { Card } from '@app/components/generic/Card';
import { EnumSelect } from '@app/components/generic/form/EnumSelect.jsx';
import { IconButton } from '@app/components/generic/IconButton.jsx';
import { Toggle } from '@app/components/generic/Toggle.jsx';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Input } from '@components/generic/form/Input';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface RadioProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Radio = ({ navOpen, setNavOpen }: RadioProps): JSX.Element => {
  const { t } = useTranslation();
  const radioConfig = useAppSelector((state) => state.meshtastic.preferences);

  const { register, handleSubmit, formState, reset } =
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
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen(!navOpen);
          }}
        />
      }
      footer={
        <div className="flex space-x-2">
          <IconButton
            icon={<FiXCircle className="w-5 h-5" />}
            disabled={formState.isDirty}
            onClick={(): void => {
              reset();
            }}
          />
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
        </div>
      }
    >
      <Card
        title="Basic settings"
        description="Device name and user parameters"
      >
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <div>WiFi</div>
            <Input label={t('strings.wifi_ssid')} {...register('wifiSsid')} />
            <Input
              type="password"
              label={t('strings.wifi_psk')}
              {...register('wifiPassword')}
            />
            <Input
              label={'Charge current'}
              disabled
              {...register('chargeCurrent', { valueAsNumber: true })}
            />
            <div>Position</div>
            <Input
              label={'Broadcast Interval (seconds)'}
              {...register('positionBroadcastSecs', { valueAsNumber: true })}
            />
            <EnumSelect
              label="Position Type"
              optionsEnum={Protobuf.PositionFlags}
              {...register('positionFlags', { valueAsNumber: true })}
            />
            <Toggle label="Use Fixed Position" {...register('fixedPosition')} />
            <EnumSelect
              label="Location Sharing"
              optionsEnum={Protobuf.LocationSharing}
              {...register('locationShare', { valueAsNumber: true })}
            />
            <EnumSelect
              label="GPS Mode"
              optionsEnum={Protobuf.GpsOperation}
              {...register('gpsOperation', { valueAsNumber: true })}
            />

            <div>Other</div>
            <Input
              label={'Last GPS Attempt'}
              disabled
              {...register('gpsAttemptTime', { valueAsNumber: true })}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
