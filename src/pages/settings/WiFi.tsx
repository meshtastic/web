import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { FormFooter } from '@app/components/FormFooter';
import { Checkbox } from '@app/components/generic/form/Checkbox';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { Input } from '@components/generic/form/Input';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface WiFiProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const WiFi = ({ navOpen, setNavOpen }: WiFiProps): JSX.Element => {
  const { t } = useTranslation();
  const preferences = useAppSelector((state) => state.meshtastic.preferences);
  const [debug, setDebug] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  const watchWifiApMode = useWatch({
    control,
    name: 'wifiApMode',
    defaultValue: false,
  });

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setPreferences(data, async () => {
      await Promise.resolve();
      setLoading(false);
    });
  });
  return (
    <PrimaryTemplate
      title="WiFi"
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
        <FormFooter
          dirty={formState.isDirty}
          saveAction={onSubmit}
          clearAction={reset}
        />
      }
    >
      <Card loading={loading}>
        <Cover enabled={debug} content={<JSONPretty data={preferences} />} />
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <Checkbox label="Enable WiFi AP" {...register('wifiApMode')} />
            <Input
              label={t('strings.wifi_ssid')}
              disabled={watchWifiApMode}
              {...register('wifiSsid')}
            />
            <Input
              type="password"
              label={t('strings.wifi_psk')}
              disabled={watchWifiApMode}
              {...register('wifiPassword')}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
