import React from 'react';

import { InputWrapper } from './InputWrapper';
import { Label } from './Label';

type DefaultInputProps = JSX.IntrinsicElements['input'];

interface InputProps extends DefaultInputProps {
  label?: string;
  error?: string;
  action?: JSX.Element;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, action, ...props }: InputProps, ref) {
    return (
      <div className="w-full">
        {label && <Label label={label} error={error} />}
        <InputWrapper error={error} disabled={props.disabled}>
          <input
            ref={ref}
            className="w-full h-10 px-3 py-2 bg-transparent focus:outline-none"
            {...props}
          />
          {action && <div className="flex mr-1">{action}</div>}
        </InputWrapper>
      </div>
    );
  },
);
