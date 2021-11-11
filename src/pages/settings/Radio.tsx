import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiCode, FiMenu, FiSave, FiXCircle } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface RadioProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Radio = ({ navOpen, setNavOpen }: RadioProps): JSX.Element => {
  const { t } = useTranslation();
  const radioConfig = useAppSelector((state) => state.meshtastic.preferences);
  const [debug, setDebug] = React.useState(false);

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
            setNavOpen && setNavOpen(!navOpen);
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
        buttons={
          <Button
            border
            active={debug}
            onClick={(): void => {
              setDebug(!debug);
            }}
            icon={<FiCode />}
          >
            Debug
          </Button>
        }
      >
        <Cover enabled={debug} content={<JSONPretty data={radioConfig} />} />
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <div>Power</div>
            <hr />
            <Input
              label={'Charge current'}
              disabled
              {...register('chargeCurrent', { valueAsNumber: true })}
            />
            <Checkbox label="Always powered" {...register('isAlwaysPowered')} />
            <Checkbox label="Low Power" {...register('isLowPower')} />
            <hr />
            <div>WiFi</div>
            <Input label={t('strings.wifi_ssid')} {...register('wifiSsid')} />
            <Input
              type="password"
              label={t('strings.wifi_psk')}
              {...register('wifiPassword')}
            />
            <hr />
            <div>Position</div>
            <Input
              label={'Broadcast Interval (seconds)'}
              type="number"
              {...register('positionBroadcastSecs', { valueAsNumber: true })}
            />
            <Select
              label="Position Type"
              optionsEnum={Protobuf.PositionFlags}
              {...register('positionFlags', { valueAsNumber: true })}
            />
            <Checkbox
              label="Use Fixed Position"
              {...register('fixedPosition')}
            />
            <Select
              label="Location Sharing"
              optionsEnum={Protobuf.LocationSharing}
              {...register('locationShare', { valueAsNumber: true })}
            />
            <Select
              label="GPS Mode"
              optionsEnum={Protobuf.GpsOperation}
              {...register('gpsOperation', { valueAsNumber: true })}
            />
            <Select
              label="Display Format"
              optionsEnum={Protobuf.GpsCoordinateFormat}
              {...register('gpsFormat', { valueAsNumber: true })}
            />
            <Checkbox label="Accept 2D Fix" {...register('gpsAccept2D')} />
            <Input
              label="Max DOP"
              type="number"
              {...register('gpsMaxDop', { valueAsNumber: true })}
            />
            <Input
              label="Last GPS Attempt"
              disabled
              {...register('gpsAttemptTime', { valueAsNumber: true })}
            />
            <hr />
            <div>Other</div>
            <Select
              label="Region"
              optionsEnum={Protobuf.RegionCode}
              {...register('region', { valueAsNumber: true })}
            />
            <Checkbox label="Debug Log" {...register('debugLogEnabled')} />
            <Checkbox label="Serial Disabled" {...register('serialDisabled')} />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
