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
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { IconButton } from '@components/generic/IconButton';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface PositionProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Position = ({
  navOpen,
  setNavOpen,
}: PositionProps): JSX.Element => {
  const preferences = useAppSelector((state) => state.meshtastic.preferences);
  const [debug, setDebug] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState, reset } =
    useForm<Protobuf.RadioConfig_UserPreferences>({
      defaultValues: {
        ...preferences,
        positionBroadcastSecs:
          preferences.positionBroadcastSecs === 0
            ? preferences.isRouter
              ? 43200
              : 900
            : preferences.positionBroadcastSecs,
      },
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
      title="Position"
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
            <Input
              label="Broadcast Interval (seconds)"
              type="number"
              {...register('positionBroadcastSecs', { valueAsNumber: true })}
            />
            <Select
              label="Position Type"
              optionsEnum={Protobuf.PositionFlags}
              {...register('positionFlags', { valueAsNumber: true })}
            />
            <Checkbox
              label="Use Fixed Position"
              {...register('fixedPosition')}
            />
            <Select
              label="Location Sharing"
              optionsEnum={Protobuf.LocationSharing}
              {...register('locationShare', { valueAsNumber: true })}
            />
            <Select
              label="GPS Mode"
              optionsEnum={Protobuf.GpsOperation}
              {...register('gpsOperation', { valueAsNumber: true })}
            />
            <Select
              label="Display Format"
              optionsEnum={Protobuf.GpsCoordinateFormat}
              {...register('gpsFormat', { valueAsNumber: true })}
            />
            <Checkbox label="Accept 2D Fix" {...register('gpsAccept2D')} />
            <Input
              label="Max DOP"
              type="number"
              {...register('gpsMaxDop', { valueAsNumber: true })}
            />
            <Input
              label="Last GPS Attempt"
              disabled
              {...register('gpsAttemptTime', { valueAsNumber: true })}
            />
          </form>
        </div>
      </Card>
    </PrimaryTemplate>
  );
};
