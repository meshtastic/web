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
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: {
        ...preferences,
        isLowPower: preferences.isRouter ? true : preferences.isLowPower,
      },
    });

  useEffect(() => {
    reset(preferences);
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setPreferences(data, async () => {
      reset({ ...data });
      setLoading(false);
      await Promise.resolve();
    });
  });
  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Select
        label="Charge current"
        optionsEnum={Protobuf.ChargeCurrent}
        {...register('chargeCurrent', { valueAsNumber: true })}
      />
      <Checkbox
        label="Powered by low power source (solar)"
        disabled={preferences.isRouter}
        validationMessage={
          preferences.isRouter ? 'Enabled by default in router mode' : ''
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
        label="Phone SDS Timeout"
        suffix="Seconds"
        type="number"
        {...register('phoneSdsTimeoutSec', { valueAsNumber: true })}
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
