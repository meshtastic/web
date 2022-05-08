import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export const RangeTestSettingsPanel = (): JSX.Element => {
  const [loading, setLoading] = useState(false);

  const rangeTestConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.rangeTest,
  );

  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_RangeTestConfig>({
      defaultValues: rangeTestConfig,
    });

  useEffect(() => {
    reset(rangeTestConfig);
  }, [reset, rangeTestConfig]);

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    await connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'rangeTest',
          rangeTest: data,
        },
      },
      async (): Promise<void> => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      },
    );
  });

  const moduleEnabled = useWatch({
    control,
    name: 'enabled',
    defaultValue: false,
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox label="Module Enabled" {...register('enabled')} />
      <Input
        type="number"
        label="Message Interval"
        disabled={!moduleEnabled}
        suffix="Seconds"
        {...register('sender', {
          valueAsNumber: true,
        })}
      />
      <Checkbox
        label="Save CSV to storage"
        disabled={!moduleEnabled}
        {...register('save')}
      />
    </Form>
  );
};
