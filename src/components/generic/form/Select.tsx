import type React from 'react';
import { forwardRef } from 'react';

import { InputWrapper } from '@components/generic/form/InputWrapper';
import { Label } from '@components/generic/form/Label';

type DefaultSelectProps = JSX.IntrinsicElements['select'];

export interface SelectProps extends DefaultSelectProps {
  options?: {
    name: string | number;
    value: string | number;
  }[];
  optionsEnum?: { [s: string]: string | number };
  label?: string;
  error?: string;
  small?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, optionsEnum, label, error, small, ...props }, ref) => {
    const optionsEnumValues = optionsEnum
      ? Object.entries(optionsEnum).filter(
          (value) => typeof value[1] === 'number',
        )
      : [];
    return (
      <div>
        {label && <Label label={label} error={error} />}
        <InputWrapper error={error} disabled={props.disabled}>
          <select
            ref={ref}
            className={`w-full rounded-md bg-transparent focus:border-primary focus:outline-none disabled:cursor-not-allowed dark:text-white ${
              small ? 'm-1' : 'mx-2 h-10'
            }`}
            disabled={
              props.disabled
                ? true
                : !(optionsEnumValues.length || options?.length)
            }
            {...props}
          >
            {!(optionsEnumValues.length || options?.length) && (
              <option key="loading" className="dark:bg-gray-700">
                Loading
              </option>
            )}
            {optionsEnumValues.length &&
              optionsEnumValues.map(([name, value], index) => (
                <option key={index} className="dark:bg-gray-700" value={value}>
                  {name}
                </option>
              ))}
            {options &&
              options.map((option, index) => (
                <option
                  key={index}
                  className="dark:bg-gray-700"
                  value={option.value}
                >
                  {option.name}
                </option>
              ))}
          </select>
        </InputWrapper>
      </div>
    );
  },
);
