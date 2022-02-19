import React from 'react';

import { useForm } from 'react-hook-form';
import { FiSave } from 'react-icons/fi';
import { base16 } from 'rfc4648';

import { IconButton } from '@components/generic/button/IconButton';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import { Protobuf } from '@meshtastic/meshtasticjs';

export const User = (): JSX.Element => {
  const [loading, setLoading] = React.useState(false);
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  ).myNodeNum;
  const node = useAppSelector((state) => state.meshtastic.nodes).find(
    (node) => node.number === myNodeNum,
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
      longName: node?.user?.longName,
      shortName: node?.user?.shortName,
      isLicensed: node?.user?.isLicensed,
      team: node?.user?.team,
      antAzimuth: node?.user?.antAzimuth,
      antGainDbi: node?.user?.antGainDbi,
      txPowerDbm: node?.user?.txPowerDbm,
    },
  });

  React.useEffect(() => {
    reset({
      longName: node?.user?.longName,
      shortName: node?.user?.shortName,
      isLicensed: node?.user?.isLicensed,
      team: node?.user?.team,
    });
  }, [reset, node]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);

    if (node?.user) {
      void connection.setOwner({ ...node.user, ...data }, async () => {
        reset({ ...data });
        setLoading(false);
        await Promise.resolve();
      });
      // TODO: can be removed once getUser is implemented
      // dispatch(
      //   addUser({ ...node.user, ...{ data: { ...node.user.data, ...data } } }),
      // );
    }
  });

  return (
    <>
      <form className="space-y-2" onSubmit={onSubmit}>
        <Input label="Device ID" value={node?.user?.id} disabled />
        <Input
          label="Hardware"
          value={
            Protobuf.HardwareModel[
              node?.user?.hwModel ?? Protobuf.HardwareModel.UNSET
            ]
          }
          disabled
        />
        <Input
          label="Mac Address"
          defaultValue={
            base16
              .stringify(node?.user?.macaddr ?? [])
              .match(/.{1,2}/g)
              ?.join(':') ?? ''
          }
          disabled
        />
        <Input label="Device Name" {...register('longName')} />
        <Input label="Short Name" maxLength={3} {...register('shortName')} />
        <Checkbox label="Licenced Operator?" {...register('isLicensed')} />
        <Select
          label="Team"
          optionsEnum={Protobuf.Team}
          {...register('team', { valueAsNumber: true })}
        />
        <Input
          label="Antenna Azimuth"
          suffix="°"
          type="number"
          {...register('antAzimuth', { valueAsNumber: true })}
        />
        <Input
          label="Antenna Gain"
          suffix="dBi"
          type="number"
          {...register('antGainDbi', { valueAsNumber: true })}
        />
        <Input
          label="Transmit Power"
          suffix="dBm"
          type="number"
          {...register('txPowerDbm', { valueAsNumber: true })}
        />
      </form>
      <div className="flex w-full bg-white dark:bg-secondaryDark">
        <div className="ml-auto p-2">
          <IconButton
            disabled={!formState.isDirty}
            onClick={async (): Promise<void> => {
              await onSubmit();
            }}
            icon={<FiSave />}
          />
        </div>
      </div>
    </>
  );
};
