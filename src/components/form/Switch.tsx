import React from 'react';

import type { FieldValues, UseControllerProps } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import MaterialSwitch from '@material-ui/core/Switch';

interface SwitchProps<T> extends UseControllerProps<T> {
  label: string;
}

export const Switch = <T extends FieldValues>({
  name,
  control,
  label,
}: SwitchProps<T>): JSX.Element => {
  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: 'This is required',
      }}
      render={({ field: { onChange, value, name } }) => (
        <div className="flex flex-col">
          <span className="block text-sm font-medium dark:text-white">
            {label}
          </span>
          <div className="relative w-14 mr-2 ml-auto select-none">
            <MaterialSwitch
              id={name}
              checked={value}
              onChange={(ev) => onChange(ev.target.checked)}
            />
          </div>
        </div>
      )}
    />
  );
};
