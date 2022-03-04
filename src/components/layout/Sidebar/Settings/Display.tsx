import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Display = (): JSX.Element => {
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
        label="Screen Timeout"
        type="number"
        suffix="Seconds"
        {...register('screenOnSecs', { valueAsNumber: true })}
      />
      <Input
        label="Carousel Delay"
        type="number"
        suffix="Seconds"
        {...register('autoScreenCarouselSecs', { valueAsNumber: true })}
      />
      <Select
        label="GPS Display Units"
        optionsEnum={Protobuf.GpsCoordinateFormat}
        {...register('gpsFormat', { valueAsNumber: true })}
      />
    </Form>
  );
};
