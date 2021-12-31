import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiMenu } from 'react-icons/fi';

import { useAppSelector } from '@app/hooks/redux';
import { FormFooter } from '@components/FormFooter';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import { Card, Checkbox, IconButton, Input } from '@meshtastic/components';
import type { RadioConfig_UserPreferences } from '@meshtastic/meshtasticjs/dist/generated';

export interface StoreAndForwardProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const StoreAndForward = ({
  navOpen,
  setNavOpen,
}: StoreAndForwardProps): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<RadioConfig_UserPreferences>({
      defaultValues: {
        storeForwardPluginEnabled: preferences.storeForwardPluginEnabled,
        storeForwardPluginRecords: preferences.storeForwardPluginRecords,
      },
    });

  React.useEffect(() => {
    reset({
      storeForwardPluginEnabled: preferences.storeForwardPluginEnabled,
      storeForwardPluginRecords: preferences.storeForwardPluginRecords,
    });
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    void connection.setPreferences(data);
  });
  //todo, add loading indicator

  const watchStoreForwardPluginEnabled = useWatch({
    control,
    name: 'storeForwardPluginEnabled',
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
                {...register('storeForwardPluginEnabled')}
              />
              <Input
                type="number"
                label="Number of records"
                disabled={!watchStoreForwardPluginEnabled}
                {...register('storeForwardPluginRecords', {
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
