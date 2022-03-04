import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const CannedMessage = (): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  const moduleEnabled = useWatch({
    control,
    name: 'rotary1Enabled',
    defaultValue: false,
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
      <Checkbox
        label="Module Enabled"
        {...register('cannedMessageModuleEnabled')}
      />
      <Checkbox
        label="Rotary Encoder #1 Enabled"
        {...register('rotary1Enabled')}
      />
      <Input
        label="Encoder #1 Pin A"
        type="number"
        disabled={moduleEnabled}
        {...register('rotary1PinA', { valueAsNumber: true })}
      />
      <Input
        label="Encoder #1 Pin B"
        type="number"
        disabled={moduleEnabled}
        {...register('rotary1PinB', { valueAsNumber: true })}
      />
      <Input
        label="Endoer #1 Pin Press"
        type="number"
        disabled={moduleEnabled}
        {...register('rotary1PinPress', { valueAsNumber: true })}
      />
      <Select
        label="Clockwise event"
        disabled={moduleEnabled}
        optionsEnum={Protobuf.InputEventChar}
        {...register('rotary1EventCw', { valueAsNumber: true })}
      />
      <Select
        label="Counter Clockwise event"
        disabled={moduleEnabled}
        optionsEnum={Protobuf.InputEventChar}
        {...register('rotary1EventCcw', { valueAsNumber: true })}
      />
      <Select
        label="Press event"
        disabled={moduleEnabled}
        optionsEnum={Protobuf.InputEventChar}
        {...register('rotary1EventPress', { valueAsNumber: true })}
      />
      <Input
        label="Allow Input Source"
        disabled={moduleEnabled}
        {...register('cannedMessageModuleAllowInputSource')}
      />
      <Checkbox
        label="Send Bell"
        {...register('cannedMessageModuleSendBell')}
      />
    </Form>
  );
};
