import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiMenu } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/redux';
import { FormFooter } from '@components/FormFooter';
import { Card } from '@components/generic/Card';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import type { RadioConfig_UserPreferences } from '@meshtastic/meshtasticjs/dist/generated';

export interface SerialProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Serial = ({ navOpen, setNavOpen }: SerialProps): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<RadioConfig_UserPreferences>({
      defaultValues: {
        serialpluginEnabled: preferences.serialpluginEnabled,
        serialpluginEcho: preferences.serialpluginEcho,
        serialpluginMode: preferences.serialpluginMode,
        serialpluginRxd: preferences.serialpluginRxd,
        serialpluginTimeout: preferences.serialpluginTimeout,
        serialpluginTxd: preferences.serialpluginTxd,
      },
    });

  React.useEffect(() => {
    reset({
      serialpluginEnabled: preferences.serialpluginEnabled,
      serialpluginEcho: preferences.serialpluginEcho,
      serialpluginMode: preferences.serialpluginMode,
      serialpluginRxd: preferences.serialpluginRxd,
      serialpluginTimeout: preferences.serialpluginTimeout,
      serialpluginTxd: preferences.serialpluginTxd,
    });
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    void connection.setPreferences(data);
  });

  const watchSerialPluginEnabled = useWatch({
    control,
    name: 'serialpluginEnabled',
    defaultValue: false,
  });

  return (
    <PrimaryTemplate
      title="Serial"
      tagline="Plugin"
      leftButton={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
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
      <div className="w-full space-y-4">
        <Card>
          <div className="w-full max-w-3xl p-10 md:max-w-xl">
            <form onSubmit={onSubmit}>
              <Checkbox
                label="Plugin Enabled"
                {...register('serialpluginEnabled')}
              />
              <Checkbox
                label="Echo"
                disabled={!watchSerialPluginEnabled}
                {...register('serialpluginEcho')}
              />

              <Input
                type="number"
                label="RX"
                disabled={!watchSerialPluginEnabled}
                {...register('serialpluginRxd', {
                  valueAsNumber: true,
                })}
              />
              <Input
                type="number"
                label="TX"
                disabled={!watchSerialPluginEnabled}
                {...register('serialpluginTxd', {
                  valueAsNumber: true,
                })}
              />
              <Input
                type="number"
                label="Mode"
                disabled={!watchSerialPluginEnabled}
                {...register('serialpluginMode', {
                  valueAsNumber: true,
                })}
              />
              <Input
                type="number"
                label="Timeout"
                disabled={!watchSerialPluginEnabled}
                {...register('serialpluginTimeout', {
                  valueAsNumber: true,
                })}
              />
            </form>
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
