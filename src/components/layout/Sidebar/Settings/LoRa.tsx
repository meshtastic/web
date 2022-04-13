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

export const LoRa = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
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
      <Input
        label="Hop Count"
        type="number"
        suffix="Hops"
        {...register('hopLimit', { valueAsNumber: true })}
      />
      <Checkbox label="Transmit Disabled" {...register('isLoraTxDisabled')} />
      <Select
        label="Operating Role"
        optionsEnum={Protobuf.Role}
        {...register('role')}
      />
      <Input
        label="Frequency Offset"
        type="number"
        suffix="Hz"
        {...register('frequencyOffset', { valueAsNumber: true })}
      />
      <Select
        label="Region"
        optionsEnum={Protobuf.RegionCode}
        {...register('region', { valueAsNumber: true })}
      />
    </Form>
  );
};
