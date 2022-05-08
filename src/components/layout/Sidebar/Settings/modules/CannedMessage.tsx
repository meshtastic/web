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
  const cannedMessageConfig = useAppSelector(
    (state) => state.meshtastic.radio.moduleConfig.cannedMessage,
  );
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState, reset, control } =
    useForm<Protobuf.ModuleConfig_CannedMessageConfig>({
      defaultValues: cannedMessageConfig,
    });

  const moduleEnabled = useWatch({
    control,
    name: 'rotary1Enabled',
    defaultValue: false,
  });

  useEffect(() => {
    reset(cannedMessageConfig);
  }, [reset, cannedMessageConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setModuleConfig(
      {
        payloadVariant: {
          oneofKind: 'cannedMessage',
          cannedMessage: data,
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
      <Checkbox label="Module Enabled" {...register('enabled')} />
      <Checkbox
        label="Rotary Encoder #1 Enabled"
        {...register('rotary1Enabled')}
      />
      <Input
        label="Encoder Pin A"
        type="number"
        disabled={moduleEnabled}
        {...register('inputbrokerPinA', { valueAsNumber: true })}
      />
      <Input
        label="Encoder Pin B"
        type="number"
        disabled={moduleEnabled}
        {...register('inputbrokerPinB', { valueAsNumber: true })}
      />
      <Input
        label="Endoer Pin Press"
        type="number"
        disabled={moduleEnabled}
        {...register('inputbrokerPinPress', { valueAsNumber: true })}
      />
      <Select
        label="Clockwise event"
        disabled={moduleEnabled}
        optionsEnum={Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar}
        {...register('inputbrokerEventCw', { valueAsNumber: true })}
      />
      <Select
        label="Counter Clockwise event"
        disabled={moduleEnabled}
        optionsEnum={Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar}
        {...register('inputbrokerEventCcw', { valueAsNumber: true })}
      />
      <Select
        label="Press event"
        disabled={moduleEnabled}
        optionsEnum={Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar}
        {...register('inputbrokerEventPress', { valueAsNumber: true })}
      />
      <Checkbox label="Up Down enabled" {...register('updown1Enabled')} />
      <Input
        label="Allow Input Source"
        disabled={moduleEnabled}
        {...register('allowInputSource')}
      />
      <Checkbox label="Send Bell" {...register('sendBell')} />
    </Form>
  );
};
