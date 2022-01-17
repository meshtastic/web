import React from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';

import { Form } from '@app/components/generic/form/Form';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/useAppSelector';
import { Tab } from '@headlessui/react';
import { Checkbox, IconButton, Input } from '@meshtastic/components';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const RangeTestSettingsPanel = (): JSX.Element => {
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
    name: 'rangeTestPluginEnabled',
    defaultValue: false,
  });

  return (
    <Tab.Panel className="flex flex-col w-full">
      <Form loading={loading}>
        <Checkbox
          label="Range Test Plugin Enabled?"
          {...register('rangeTestPluginEnabled')}
        />
        <Checkbox
          label="Range Test Plugin Save?"
          disabled={!pluginEnabled}
          {...register('rangeTestPluginSave')}
        />
        <Input
          type="number"
          label="Message Interval"
          disabled={!pluginEnabled}
          suffix="Seconds"
          {...register('rangeTestPluginSender', {
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
