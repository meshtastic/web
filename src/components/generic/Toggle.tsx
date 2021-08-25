import React from 'react';

import { Switch } from '@headlessui/react';

type DefaultButtonProps = JSX.IntrinsicElements['button'];

interface ToggleProps extends DefaultButtonProps {
  label?: string;
  valid?: boolean;
  validationMessage?: string;
}

export const Toggle = ({
  label,
  valid,
  validationMessage,
  id,
  ...props
}: ToggleProps): JSX.Element => {
  const [enabled, setEnabled] = React.useState(false);

  return (
    <div className="flex flex-col w-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-black dark:text-white"
      >
        {label}
      </label>
      <div className="ml-auto">
        <Switch
          id={id}
          {...props}
          checked={enabled}
          onChange={setEnabled}
          className={`${
            enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-secondaryDark'
          }
          relative inline-flex flex-shrink-0 h-[38px] w-[74px] border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
        >
          <span className="sr-only">Use setting</span>
          <span
            aria-hidden="true"
            className={`${enabled ? 'translate-x-9' : 'translate-x-0'}
            pointer-events-none inline-block h-[34px] w-[34px] rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200`}
          />
        </Switch>
      </div>
      {!valid && (
        <div className="text-sm text-gray-600">{validationMessage}</div>
      )}
    </div>
  );
};
