import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { FormFooter } from '@app/components/FormFooter';
import { connection } from '@app/core/connection';
import { addUser } from '@app/core/slices/meshtasticSlice';
import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface UserProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const User = ({ navOpen, setNavOpen }: UserProps): JSX.Element => {
  const { t } = useTranslation();
  const [debug, setDebug] = React.useState(false);
  const dispatch = useAppDispatch();
  const myNodeInfo = useAppSelector((state) => state.meshtastic.myNodeInfo);
  const user = useAppSelector((state) => state.meshtastic.users).find(
    (user) => user.packet.from === myNodeInfo.myNodeNum,
  );
  const { register, handleSubmit, formState, reset } = useForm<{
    longName: string;
    shortName: string;
    isLicensed: boolean;
    team: Protobuf.Team;
  }>({
    defaultValues: {
      longName: user?.data.longName,
      shortName: user?.data.shortName,
      isLicensed: user?.data.isLicensed,
      team: user?.data.team,
    },
  });

  const onSubmit = handleSubmit((data) => {
    // TODO: can be removed once getUser is implemented
    if (user) {
      void connection.setOwner({ ...user.data, ...data });
      dispatch(addUser({ ...user, ...{ data: { ...user.data, ...data } } }));
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
      <Card>
        <Cover enabled={debug} content={<JSONPretty data={user} />} />
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <Input label={'Device ID'} value={user?.data.id} disabled />
            <Input
              label={'Hardware'}
              value={
                Protobuf.HardwareModel[
                  user?.data.hwModel ?? Protobuf.HardwareModel.UNSET
                ]
              }
              disabled
            />
            <Input label={'Device Name'} {...register('longName')} />
            <Input
              label={'Short Name'}
              maxLength={3}
              {...register('shortName')}
            />
            <Checkbox label="Licenced Operator?" {...register('isLicensed')} />
            <Select
              label="Team"
              optionsEnum={Protobuf.Team}
              {...register('team', { valueAsNumber: true })}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
