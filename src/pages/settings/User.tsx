import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';
import { base16 } from 'rfc4648';

import { useAppSelector } from '@app/hooks/redux';
import { FormFooter } from '@components/FormFooter';
import { Cover } from '@components/generic/Cover';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import {
  Card,
  Checkbox,
  IconButton,
  Input,
  Select,
} from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface UserProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const User = ({ navOpen, setNavOpen }: UserProps): JSX.Element => {
  const [debug, setDebug] = React.useState(false);
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
        await Promise.resolve();
        setLoading(false);
      });
      // TODO: can be removed once getUser is implemented
      // dispatch(
      //   addUser({ ...node.user, ...{ data: { ...node.user.data, ...data } } }),
      // );
    }
  });

  return (
    <PrimaryTemplate
      title="User"
      tagline="Settings"
      leftButton={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
      rightButton={
        <IconButton
          icon={<FiCode className="w-5 h-5" />}
          active={debug}
          onClick={(): void => {
            setDebug(!debug);
          }}
        />
      }
      footer={
        <FormFooter
          dirty={formState.isDirty}
          saveAction={onSubmit}
          clearAction={reset}
        />
      }
    >
      <Card loading={loading}>
        <Cover enabled={debug} content={<JSONPretty data={node?.user} />} />
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
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
            <Input
              label="Short Name"
              maxLength={3}
              {...register('shortName')}
            />
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
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
