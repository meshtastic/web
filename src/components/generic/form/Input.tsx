import type React from 'react';
import { forwardRef } from 'react';

import { InputWrapper } from '@components/generic/form/InputWrapper';
import { Label } from '@components/generic/form/Label';

type DefaultInputProps = JSX.IntrinsicElements['input'];

export interface InputProps extends DefaultInputProps {
  label?: string;
  error?: string;
  action?: JSX.Element;
  prefix?: string;
  suffix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, action, suffix, className, disabled, ...props }: InputProps,
  ref,
) {
  return (
    <div className="w-full">
      {label && <Label label={label} error={error} />}
      <InputWrapper error={error} disabled={disabled}>
        <input
          ref={ref}
          className={`h-10 w-full bg-transparent px-3 py-2 focus:outline-none disabled:cursor-not-allowed dark:text-white ${
            className ?? ''
          }`}
          {...props}
        />
        {suffix && (
          <span className="my-auto mr-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            {suffix}
          </span>
        )}
        {action && <div className="mr-1 flex">{action}</div>}
      </InputWrapper>
    </div>
  );
});
