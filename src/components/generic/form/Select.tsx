import React from 'react';

import { InputWrapper } from './InputWrapper';
import { Label } from './Label';

type DefaultSelectProps = JSX.IntrinsicElements['select'];

interface SelectProps extends DefaultSelectProps {
  options?: {
    name: string | number;
    value: string | number;
  }[];
  optionsEnum?: { [s: string]: string | number };
  label?: string;
  error?: string;
  small?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, optionsEnum, label, error, small, ...props }, ref) => {
    const optionsEnumValues = optionsEnum
      ? Object.entries(optionsEnum).filter(
          (value) => typeof value[1] === 'number',
        )
      : [];
    return (
      <div>
        {label && <Label label={label} error={error} />}
        <InputWrapper>
          <select
            ref={ref}
            className={`w-full rounded-md bg-white dark:bg-transparent focus:outline-none focus:border-primary ${
              small ? 'p-1' : 'h-10 px-2'
            }`}
            disabled={
              props.disabled
                ? true
                : !(optionsEnumValues.length || options?.length)
            }
            {...props}
          >
            {!(optionsEnumValues.length || options?.length) && (
              <option className="dark:bg-gray-700">Loading</option>
            )}
            {optionsEnumValues.length &&
              optionsEnumValues.map(([name, value]) => (
                <option className="dark:bg-gray-700" key={value} value={value}>
                  {name}
                </option>
              ))}
            {options &&
              options.map((option) => (
                <option
                  className="dark:bg-gray-700"
                  key={option.value}
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
