import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Telemetry = (): JSX.Element => {
  const telemetryConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.telemetry,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_TelemetryConfig>({
      defaultValues: telemetryConfig,
    });

  useEffect(() => {
    reset(telemetryConfig);
  }, [reset, telemetryConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'telemetry',
          telemetry: data,
        },
      },
      async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      },
    );
  });
  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Checkbox
        label="Measurement Enabled"
        {...register('environmentMeasurementEnabled')}
      />
      <Checkbox
        label="Displayed on Screen"
        {...register('environmentScreenEnabled')}
      />
      <Input
        label="Read Error Count Threshold"
        type="number"
        {...register('environmentReadErrorCountThreshold', {
          valueAsNumber: true,
        })}
      />
      <Input
        label="Update Interval"
        suffix="Seconds"
        type="number"
        {...register('environmentUpdateInterval', {
          valueAsNumber: true,
        })}
      />
      <Input
        label="Recovery Interval"
        suffix="Seconds"
        type="number"
        {...register('environmentRecoveryInterval', {
          valueAsNumber: true,
        })}
      />
      <Checkbox
        label="Display Farenheit"
        {...register('environmentDisplayFahrenheit')}
      />
      <Select
        label="Sensor Type"
        optionsEnum={Protobuf.TelemetrySensorType}
        {...register('environmentSensorType', {
          valueAsNumber: true,
        })}
      />
      <Input
        label="Sensor Pin"
        type="number"
        {...register('environmentSensorPin', {
          valueAsNumber: true,
        })}
      />
    </Form>
  );
};
