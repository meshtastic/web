import React from 'react';

import { Listbox } from '@headlessui/react';
import { CheckIcon, SelectorIcon } from '@heroicons/react/solid';

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
            <div className="">{active.icon}</div>
            <span className="block truncate">{active.name}</span>
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
                className={({ active }): string =>
                  `cursor-default select-none relative py-2 pl-10 pr-4 first:rounded-t-md last:rounded-b-md dark:text-white ${
                    active ? 'bg-gray-200 dark:bg-primaryDark' : 'text-gray-900'
                  }`
                }
                value={option.value}
              >
                {({ selected, active }): JSX.Element => (
                  <>
                    <span
                      className={`${
                        selected ? 'font-medium' : 'font-normal'
                      } block truncate`}
                    >
                      {option.name}
                    </span>
                    {selected ? (
                      <span
                        className={`${
                          active ? 'text-amber-600' : 'text-amber-600'
                        }
                                absolute inset-y-0 left-0 flex items-center pl-3`}
                      >
                        <CheckIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                    ) : null}
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
