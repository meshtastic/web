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
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware.myNodeNum,
  );
  const loraConfig = useAppSelector(
    (state) => state.meshtastic.radio.config.lora,
  );
  const [loading, setLoading] = useState(false);
  const [usePreset, setUsePreset] = useState(true);
  // const { register, handleSubmit, formState, reset } =
  //   useForm<Protobuf.RadioConfig_UserPreferences>({
  //     defaultValues: preferences,
  //   });
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.Config_LoRaConfig>({
      defaultValues: loraConfig,
    });

  useEffect(() => {
    reset(loraConfig);
  }, [reset, loraConfig]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);

    const packet = Protobuf.AdminMessage.create({
      variant: {
        oneofKind: 'setConfig',
        setConfig: {
          payloadVariant: {
            oneofKind: 'lora',
            lora: data,
          },
        },
      },
    });

    void connection.sendPacket(
      Protobuf.AdminMessage.toBinary(packet),
      Protobuf.PortNum.ADMIN_APP,
      myNodeNum,
      true,
      0,
      true,
      false,
      async (num) => {
        return await Promise.resolve();
      },
    );
    // void connection.setPreferences(data, async () => {
    //   reset({ ...data });
    //   setLoading(false);
    //   await Promise.resolve();
    // });
  });
  return (
    <>
      <Checkbox
        checked={usePreset}
        label="Use Presets"
        onChange={(e): void => setUsePreset(e.target.checked)}
      />
      <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
        {usePreset ? (
          <Select
            label="Preset"
            optionsEnum={Protobuf.Config_LoRaConfig_ModemPreset}
            {...register('modemPreset', {
              valueAsNumber: true,
            })}
          />
        ) : (
          <>
            <Input
              label="Bandwidth"
              type="number"
              suffix="MHz"
              {...register('bandwidth', {
                valueAsNumber: true,
              })}
            />
            <Input
              label="Spread Factor"
              type="number"
              suffix="CPS"
              min={7}
              max={12}
              {...register('spreadFactor', {
                valueAsNumber: true,
              })}
            />
            <Input
              label="Coding Rate"
              type="number"
              {...register('codingRate', {
                valueAsNumber: true,
              })}
            />
          </>
        )}
        <Input
          label="Transmit Power"
          type="number"
          suffix="dBm"
          {...register('txPower', { valueAsNumber: true })}
        />
        <Input
          label="Hop Count"
          type="number"
          suffix="Hops"
          {...register('hopLimit', { valueAsNumber: true })}
        />
        <Checkbox label="Transmit Disabled" {...register('txDisabled')} />
        <Input
          label="Frequency Offset"
          type="number"
          suffix="Hz"
          {...register('frequencyOffset', { valueAsNumber: true })}
        />
        <Select
          label="Region"
          optionsEnum={Protobuf.Config_LoRaConfig_RegionCode}
          {...register('region', { valueAsNumber: true })}
        />
      </Form>
    </>
  );
};
