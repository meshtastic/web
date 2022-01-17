import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';

import { Form } from '@app/components/generic/form/Form';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/useAppSelector';
import { Tab } from '@headlessui/react';
import { Checkbox, IconButton, Input } from '@meshtastic/components';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const SerialSettingsPanel = (): JSX.Element => {
  const [loading, setLoading] = React.useState(false);

  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  React.useEffect(() => {
    reset(preferences);
  }, [reset, preferences]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection.setPreferences(data, async (): Promise<void> => {
      reset({ ...data });
      setLoading(false);
      await Promise.resolve();
    });
  });

  const pluginEnabled = useWatch({
    control,
    name: 'serialpluginEnabled',
    defaultValue: false,
  });

  return (
    <Tab.Panel className="flex flex-col w-full">
      <Form loading={loading}>
        <Checkbox label="Plugin Enabled" {...register('serialpluginEnabled')} />
        <Checkbox
          label="Echo"
          disabled={!pluginEnabled}
          {...register('serialpluginEcho')}
        />

        <Input
          type="number"
          label="RX"
          disabled={!pluginEnabled}
          {...register('serialpluginRxd', {
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          label="TX"
          disabled={!pluginEnabled}
          {...register('serialpluginTxd', {
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          label="Mode"
          disabled={!pluginEnabled}
          {...register('serialpluginMode', {
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          label="Timeout"
          disabled={!pluginEnabled}
          {...register('serialpluginTimeout', {
            valueAsNumber: true,
          })}
        />
      </Form>
      <div className="flex w-full bg-white dark:bg-secondaryDark">
        <div className="p-2 ml-auto">
          <IconButton
            disabled={!formState.isDirty}
            onClick={async (): Promise<void> => {
              await onSubmit();
            }}
            icon={<FiSave />}
          />
        </div>
      </div>
    </Tab.Panel>
  );
};
