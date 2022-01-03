import React from 'react';

import { Controller, useForm } from 'react-hook-form';
import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';
import type { Theme } from 'react-select';
import ReactSelect from 'react-select';

import { FormFooter } from '@components/FormFooter';
import { Cover } from '@components/generic/Cover';
import { Label } from '@components/generic/form/Label';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';
import {
  Card,
  Checkbox,
  IconButton,
  Input,
  Select,
} from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

export interface PositionProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Position = ({
  navOpen,
  setNavOpen,
}: PositionProps): JSX.Element => {
  const preferences = useAppSelector(
    (state) => state.meshtastic.radio.preferences,
  );
  const darkMode = useAppSelector((state) => state.app.darkMode);
  const [debug, setDebug] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState, reset, control } =
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

  // const watchPsk = useWatch({
  //   control,
  //   name: 'positionFlags',
  //   defaultValue: 0,
  // });

  React.useEffect(() => {
    reset(preferences);
  }, [reset, preferences]);

  const onSubmit = handleSubmit((data) => {
    setLoading(true);
    void connection.setPreferences(data, async () => {
      await Promise.resolve();
      setLoading(false);
    });
  });

  const encode = (enums: Protobuf.PositionFlags[]): number => {
    return enums.reduce((acc, curr) => acc | curr, 0);
  };

  const decode = (value: number): Protobuf.PositionFlags[] => {
    const enumValues = Object.keys(Protobuf.PositionFlags)
      .map(Number)
      .filter(Boolean);

    return enumValues.map((b) => value & b).filter(Boolean);
  };

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
              label="Broadcast Interval"
              type="number"
              suffix="Seconds"
              {...register('positionBroadcastSecs', { valueAsNumber: true })}
            />

            <Controller
              name="positionFlags"
              control={control}
              render={({ field, fieldState }): JSX.Element => {
                const { value, onChange, ...rest } = field;
                const { error } = fieldState;
                const label = 'Position Flags';
                return (
                  <div className="w-full">
                    {label && <Label label={label} error={error?.message} />}
                    <ReactSelect
                      {...rest}
                      isMulti
                      theme={(theme): Theme => ({
                        ...theme,
                        borderRadius: 7,
                        colors: {
                          ...theme.colors,
                          primary: '#67ea94', //focus border color
                          // primary75: 'red',
                          // primary50: 'red',
                          // primary25: 'red',
                          // danger: 'red',
                          // dangerLight: 'red',
                          neutral0: darkMode ? 'rgb(30 41 59)' : 'white', //bg color
                          // neutral5: 'red',
                          neutral10: darkMode
                            ? 'rgb(75 85 99)'
                            : 'rgb(229 231 235)', //tag bg color
                          neutral20: darkMode
                            ? 'rgb(229 231 235)'
                            : 'rgb(156 163 175)', //border color
                          neutral30: '#67ea94', //border hover
                          // neutral40: 'red',
                          // neutral50: 'red',
                          // neutral60: 'red',
                          // neutral70: 'red',
                          neutral80: darkMode ? 'white' : 'black', //tag text color
                          // neutral90: 'red',
                        },
                      })}
                      value={decode(value).map((flag) => {
                        return {
                          value: flag,
                          label: Protobuf.PositionFlags[flag].replace(
                            'POS_',
                            '',
                          ),
                        };
                      })}
                      options={Object.entries(Protobuf.PositionFlags)
                        .filter((value) => typeof value[1] !== 'number')
                        .filter(
                          (value) =>
                            parseInt(value[0]) !==
                            Protobuf.PositionFlags.POS_UNDEFINED,
                        )
                        .map((value) => {
                          return {
                            value: parseInt(value[0]),
                            label: value[1].toString().replace('POS_', ''),
                          };
                        })}
                      onChange={(e): void =>
                        onChange(encode(e.map((v) => v.value)))
                      }
                    />
                  </div>
                );
              }}
            />

            <Input
              label="Position Type (DEBUG)"
              type="number"
              disabled
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
