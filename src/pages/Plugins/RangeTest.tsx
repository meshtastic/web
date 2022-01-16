import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiMenu } from 'react-icons/fi';

import { FormFooter } from '@components/FormFooter';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Card, Checkbox, IconButton, Input } from '@meshtastic/components';
import type { RadioConfig_UserPreferences } from '@meshtastic/meshtasticjs/dist/generated';

export interface RangeTestProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RangeTest = ({
  navOpen,
  setNavOpen,
}: RangeTestProps): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<RadioConfig_UserPreferences>({
      defaultValues: {
        rangeTestPluginEnabled: preferences.rangeTestPluginEnabled,
        rangeTestPluginSave: preferences.rangeTestPluginSave,
        rangeTestPluginSender: preferences.rangeTestPluginSender,
      },
    });

  React.useEffect(() => {
    reset({
      rangeTestPluginEnabled: preferences.rangeTestPluginEnabled,
      rangeTestPluginSave: preferences.rangeTestPluginSave,
      rangeTestPluginSender: preferences.rangeTestPluginSender,
    });
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    void connection.setPreferences(data, async (): Promise<void> => {
      //add loading indicator
      reset({ ...data });
      await Promise.resolve();
    });
  });

  //todo, add loading indicator

  const watchRangeTestPluginEnabled = useWatch({
    control,
    name: 'rangeTestPluginEnabled',
    defaultValue: false,
  });

  return (
    <PrimaryTemplate
      title="Range Test"
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
                label="Range Test Plugin Enabled?"
                {...register('rangeTestPluginEnabled')}
              />
              <Checkbox
                label="Range Test Plugin Save?"
                disabled={!watchRangeTestPluginEnabled}
                {...register('rangeTestPluginSave')}
              />
              <Input
                type="number"
                label="Message Interval"
                disabled={!watchRangeTestPluginEnabled}
                {...register('rangeTestPluginSender', {
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
