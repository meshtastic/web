import React from 'react';

import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FiCode, FiMenu, FiSave } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { connection } from '@app/core/connection';
import { addUser } from '@app/core/slices/meshtasticSlice';
import { useAppDispatch, useAppSelector } from '@app/hooks/redux';
import { Button } from '@components/generic/Button';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface DeviceProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Device = ({ navOpen, setNavOpen }: DeviceProps): JSX.Element => {
  const { t } = useTranslation();
  const [debug, setDebug] = React.useState(false);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.meshtastic.myUser);
  const { register, handleSubmit, formState } = useForm<{
    longName: string;
    shortName: string;
    isLicensed: boolean;
    team: Protobuf.Team;
  }>({
    defaultValues: {
      longName: user.longName,
      shortName: user.shortName,
      isLicensed: user.isLicensed,
      team: user.team,
    },
  });

  const onSubmit = handleSubmit((data) => {
    void connection.setOwner({ ...user, ...data });
    // TODO: can be remove once getUser is implemented
    dispatch(addUser({ ...user, ...data }));
  });

  return (
    <PrimaryTemplate
      title="Device"
      tagline="Settings"
      button={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
      footer={
        <Button
          className="px-10 ml-auto"
          icon={<FiSave className="w-5 h-5" />}
          disabled={!formState.isDirty}
          onClick={onSubmit}
          active
          border
        >
          {t('strings.save_changes')}
        </Button>
      }
    >
      <Card
        title="Basic settings"
        description="Device name and user parameters"
        buttons={
          <Button
            border
            active={debug}
            onClick={(): void => {
              setDebug(!debug);
            }}
            icon={<FiCode />}
          >
            Debug
          </Button>
        }
      >
        <Cover enabled={debug} content={<JSONPretty data={user} />} />
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <Input label={'Device ID'} value={user.id} disabled />
            <Input
              label={'Hardware'}
              value={Protobuf.HardwareModel[user.hwModel]}
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
              {...register('team')}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
