import React from 'react';

import { Listbox } from '@headlessui/react';
import { SelectorIcon } from '@heroicons/react/solid';

export interface SelectProps {
  label: string;
  options: {
    name: string;
    value: string;
    icon: JSX.Element;
  }[];
  id: string;
  active: {
    name: string;
    value: string;
    icon: JSX.Element;
  };
  onChange: (value: string) => void;
}

export const Select = ({
  label,
  options,
  id,
  active,
  onChange,
}: SelectProps): JSX.Element => {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-black dark:text-white"
      >
        {label}
      </label>

      <Listbox value={active.value} onChange={onChange}>
        <div className="relative mt-1">
          <Listbox.Button className="flex w-full text-left bg-white border rounded-md shadow-sm h-11 focus:outline-none focus:border-primary dark:focus:border-primary dark:bg-secondaryDark dark:border-gray-600 dark:text-white">
            <div className="mx-2 my-auto">{active.icon}</div>
            <span className="block my-auto truncate">{active.name}</span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <SelectorIcon
                className="w-5 h-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Listbox.Options className="absolute w-full bg-white border rounded-md shadow-sm focus:outline-none dark:bg-secondaryDark dark:border-gray-600 dark:text-white">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active, selected }): string =>
                  `cursor-default select-none relative py-2 pr-4 first:rounded-t-md last:rounded-b-md dark:text-white ${
                    active || selected
                      ? 'bg-gray-200 dark:bg-primaryDark'
                      : 'text-gray-900'
                  }`
                }
                value={option.value}
              >
                {({ selected }): JSX.Element => (
                  <>
                    <span
                      className={`flex truncate ${
                        selected ? 'font-medium' : 'font-normal'
                      }`}
                    >
                      <div className="mx-4 my-auto">{option.icon}</div>
                      {option.name}
                    </span>
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
};
