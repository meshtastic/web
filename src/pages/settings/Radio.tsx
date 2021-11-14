import React from 'react';

import { useForm } from 'react-hook-form';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { FormFooter } from '@app/components/FormFooter';
import { connection } from '@app/core/connection';
import { useAppSelector } from '@app/hooks/redux';
import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface RadioProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Radio = ({ navOpen, setNavOpen }: RadioProps): JSX.Element => {
  const preferences = useAppSelector((state) => state.meshtastic.preferences);
  const [debug, setDebug] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: preferences,
    });

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setPreferences(data, async () => {
      await Promise.resolve();
      setLoading(false);
    });
  });
  return (
    <PrimaryTemplate
      title="Radio"
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
        <Cover enabled={debug} content={<JSONPretty data={preferences} />} />
        <div className="w-full max-w-3xl p-10 md:max-w-xl">
          <form className="space-y-2" onSubmit={onSubmit}>
            <Checkbox label="Is Router" {...register('isRouter')} />
            <Select
              label="Region"
              optionsEnum={Protobuf.RegionCode}
              {...register('region', { valueAsNumber: true })}
            />
            <Checkbox label="Debug Log" {...register('debugLogEnabled')} />
            <Checkbox label="Serial Disabled" {...register('serialDisabled')} />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
