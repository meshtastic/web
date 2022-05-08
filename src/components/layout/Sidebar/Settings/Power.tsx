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

export const Power = (): JSX.Element => {
  const powerConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.power,
  );
  const deviceConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.device,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.Config_PowerConfig>({
      defaultValues: powerConfig,
      // defaultValues: {
      //   ...preferences,
      //   isLowPower:
      //     preferences.role === Protobuf.Role.Router
      //       ? true
      //       : preferences.isLowPower,
      // },
    });

  useEffect(() => {
    reset(powerConfig);
  }, [reset, powerConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setConfig(
      {
        payloadVariant: {
          oneofKind: 'power',
          power: data,
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
      <Select
        label="Charge current"
        optionsEnum={Protobuf.Config_PowerConfig_ChargeCurrent}
        {...register('chargeCurrent', { valueAsNumber: true })}
      />
      <Checkbox
        label="Powered by low power source (solar)"
        disabled={
          deviceConfig.role === Protobuf.Config_DeviceConfig_Role.Router
        }
        validationMessage={
          deviceConfig.role === Protobuf.Config_DeviceConfig_Role.Router
            ? 'Enabled by default in router mode'
            : ''
        }
        {...register('isLowPower')}
      />
      <Checkbox label="Always Powered" {...register('isAlwaysPowered')} />
      <Input
        label="Shutdown on battery delay"
        type="number"
        suffix="Seconds"
        {...register('onBatteryShutdownAfterSecs', { valueAsNumber: true })}
      />
      <Checkbox label="Power Saving" {...register('isPowerSaving')} />
      <Input
        label="ADC Multiplier Override ratio"
        type="number"
        {...register('adcMultiplierOverride', { valueAsNumber: true })}
      />
      <Input
        label="Minumum Wake Time"
        suffix="Seconds"
        type="number"
        {...register('minWakeSecs', { valueAsNumber: true })}
      />
      <Input
        label="Phone Timeout"
        suffix="Seconds"
        type="number"
        {...register('phoneTimeoutSecs', { valueAsNumber: true })}
      />
      <Input
        label="Mesh SDS Timeout"
        suffix="Seconds"
        type="number"
        {...register('meshSdsTimeoutSecs', { valueAsNumber: true })}
      />
      <Input
        label="SDS"
        suffix="Seconds"
        type="number"
        {...register('sdsSecs', { valueAsNumber: true })}
      />
      <Input
        label="LS"
        suffix="Seconds"
        type="number"
        {...register('lsSecs', { valueAsNumber: true })}
      />
      <Input
        label="Wait Bluetooth"
        suffix="Seconds"
        type="number"
        {...register('waitBluetoothSecs', { valueAsNumber: true })}
      />
    </Form>
  );
};
