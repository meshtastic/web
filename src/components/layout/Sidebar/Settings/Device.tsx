import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const Device = (): JSX.Element => {
  const deviceConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.device,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.Config_DeviceConfig>({
      defaultValues: deviceConfig,
    });

  useEffect(() => {
    reset(deviceConfig);
  }, [reset, deviceConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setConfig(
      {
        payloadVariant: {
          oneofKind: 'device',
          device: data,
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
        label="Serial Console Disabled"
        {...register('serialDisabled')}
      />
      <Checkbox label="Factory Reset Device" {...register('factoryReset')} />
      <Checkbox label="Enabled Debug Log" {...register('debugLogEnabled')} />
      <Checkbox
        label="Disable Serial COnsole"
        {...register('serialDisabled')}
      />
      <Select
        label="Role"
        optionsEnum={Protobuf.Config_DeviceConfig_Role}
        {...register('role', { valueAsNumber: true })}
      />
    </Form>
  );
};
