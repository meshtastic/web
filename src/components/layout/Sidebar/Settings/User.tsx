import type React from 'react';
import { useEffect, useState } from 'react';

import { useForm } from 'react-hook-form';
import { base16 } from 'rfc4648';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Form } from '@components/generic/form/Form';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const User = (): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  ).myNodeNum;
  const node = useAppSelector((state) => state.meshtastic.nodes).find(
    (node) => node.data.num === myNodeNum,
  );
  const { register, handleSubmit, formState, reset } = useForm<{
    longName: string;
    shortName: string;
    isLicensed: boolean;
    team: Protobuf.Team;
    antAzimuth: number;
    antGainDbi: number;
    txPowerDbm: number;
  }>({
    defaultValues: {
      longName: node?.data.user?.longName,
      shortName: node?.data.user?.shortName,
      isLicensed: node?.data.user?.isLicensed,
      team: node?.data.user?.team,
      antAzimuth: node?.data.user?.antAzimuth,
      antGainDbi: node?.data.user?.antGainDbi,
      txPowerDbm: node?.data.user?.txPowerDbm,
    },
  });

  useEffect(() => {
    reset({
      longName: node?.data.user?.longName,
      shortName: node?.data.user?.shortName,
      isLicensed: node?.data.user?.isLicensed,
      team: node?.data.user?.team,
    });
  }, [reset, node]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);

    if (node?.data.user) {
      void connection.setOwner({ ...node.data.user, ...data }, async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      });
    }
  });

  return (
    <Form loading={loading} dirty={!formState.isDirty} submit={onSubmit}>
      <Input label="Device ID" value={node?.data.user?.id} disabled />
      <Input label="Device Name" {...register('longName')} />
      <Input label="Short Name" maxLength={3} {...register('shortName')} />
      <Input
        label="Mac Address"
        defaultValue={
          base16
            .stringify(node?.data.user?.macaddr ?? [])
            .match(/.{1,2}/g)
            ?.join(':') ?? ''
        }
        disabled
      />
      <Input
        label="Hardware (DEPRECATED)"
        value={
          Protobuf.HardwareModel[
            node?.data.user?.hwModel ?? Protobuf.HardwareModel.UNSET
          ]
        }
        disabled
      />
      <Checkbox label="Licenced Operator?" {...register('isLicensed')} />
      <Select
        label="Team (DEPRECATED)"
        optionsEnum={Protobuf.Team}
        {...register('team', { valueAsNumber: true })}
      />
      <Input
        label="Transmit Power"
        suffix="dBm"
        type="number"
        {...register('txPowerDbm', { valueAsNumber: true })}
      />
      <Input
        label="Antenna Gain"
        suffix="dBi"
        type="number"
        {...register('antGainDbi', { valueAsNumber: true })}
      />
      <Input
        label="Antenna Azimuth"
        suffix="°"
        type="number"
        {...register('antAzimuth', { valueAsNumber: true })}
      />
    </Form>
  );
};
