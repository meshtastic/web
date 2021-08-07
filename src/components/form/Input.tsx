import React from 'react';

export interface InputProps {
  valid?: boolean;
  placeholder?: string;
  validationMessage?: string;
  icon?: JSX.Element;
  type: string;
  name: string;
  value?: string;
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input = ({
  valid,
  placeholder,
  validationMessage,
  icon,
  type,
  name,
  value,
  disabled,
  onChange,
}: InputProps): JSX.Element => {
  return (
    <div className="space-y-1">
      <label
        htmlFor={name}
        className="block text-sm font-medium dark:text-white"
      >
        {name}
      </label>
      <div className="relative">
        {icon && (
          <div className="flex absolute inset-y-0 left-0 px-3 items-center pointer-events-none">
            {React.cloneElement(icon, {
              className: 'w-5 h-5 text-gray-500 dark:text-gray-600',
            })}
          </div>
        )}
        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          className={`block w-full h-11 rounded-md border shadow-sm focus:outline-none focus:border-primary dark:focus:border-primary dark:bg-secondaryDark dark:border-gray-600 dark:text-white ${
            icon ? 'pl-9' : 'pl-2'
          }`}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      {!valid && (
        <div className="text-sm text-gray-600">{validationMessage}</div>
      )}
    </div>
  );
};
