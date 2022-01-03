import type React from 'react';

import type { Noop, RefCallBack } from 'react-hook-form';
import type { Theme } from 'react-select';
import ReactSelect from 'react-select';

import { bitwiseDecode, bitwiseEncode } from '@app/core/utils/bitwise';
import { useAppSelector } from '@hooks/useAppSelector';

import { Label } from './Label';

export interface BiwiseSelectProps {
  label: string;
  error?: string;
  value: number;
  optionsEnum: { [s: string]: string | number };
  onChange: (...event: unknown[]) => void;
  onBlur: Noop;
  name: string;
  ref: RefCallBack;
}

export const BitwiseSelect = ({
  label,
  error,
  value,
  optionsEnum,
  onChange,
  ref,
}: BiwiseSelectProps): JSX.Element => {
  const darkMode = useAppSelector((state) => state.app.darkMode);

  return (
    <div className="w-full">
      {label && <Label label={label} error={error} />}
      <ReactSelect
        ref={ref}
        isMulti
        // styles={{
        //   control: (provided, state) => ({
        //     ...provided,
        //     // color: state.isFocused ? 'blue' : 'red',
        //     // borderColor: state.isFocused ? 'blue' : 'red',
        //   }),
        // }}
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
            neutral10: darkMode ? 'rgb(75 85 99)' : 'rgb(229 231 235)', //tag bg color
            neutral20: darkMode ? 'rgb(229 231 235)' : 'rgb(156 163 175)', //border color
            neutral30: '#67ea94', //border hover
            // neutral40: 'red',
            // neutral50: 'red',
            // neutral60: 'red',
            // neutral70: 'red',
            neutral80: darkMode ? 'white' : 'black', //tag text color
            // neutral90: 'red',
          },
        })}
        value={bitwiseDecode(value, optionsEnum).map((flag) => {
          return {
            value: flag,
            label: (optionsEnum[flag] as string).replace('POS_', ''),
          };
        })}
        options={Object.entries(optionsEnum)
          .filter((value) => typeof value[1] !== 'number')
          .filter((value) => parseInt(value[0]) !== optionsEnum.POS_UNDEFINED)
          .map((value) => {
            return {
              value: parseInt(value[0]),
              label: value[1].toString().replace('POS_', ''),
            };
          })}
        onChange={(e): void => onChange(bitwiseEncode(e.map((v) => v.value)))}
      />
    </div>
  );
};
