import React from 'react';

import { InputWrapper } from './InputWrapper.jsx';
import { Label } from './Label.jsx';

type DefaultSelectProps = JSX.IntrinsicElements['select'];

interface SelectProps extends DefaultSelectProps {
  options?: {
    name: string;
    value: number | string;
  }[];
  optionsEnum?: { [s: string]: string | number };
  label?: string;
  error?: string;
  small?: boolean;
}

export const EnumSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
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
            className={`w-full  bg-transparent focus:outline-none focus:border-primary ${
              small ? 'py-1 mx-1' : 'h-10 mx-2'
            }`}
            {...props}
          >
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
