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
  const displayConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.display,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.Config_DisplayConfig>({
      defaultValues: displayConfig,
    });

  useEffect(() => {
    reset(displayConfig);
  }, [reset, displayConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setConfig(
      {
        payloadVariant: {
          oneofKind: 'display',
          display: data,
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
        optionsEnum={Protobuf.Config_DisplayConfig_GpsCoordinateFormat}
        {...register('gpsFormat', { valueAsNumber: true })}
      />
    </Form>
  );
};
