import React from 'react';

import { Jp, Pt, Us } from 'react-flags-select';

import { Menu } from '@headlessui/react';

import { useAppDispatch } from '../../../hooks/redux';
import i18n from '../../../translation';
import { Button } from '../../generic/Button';

export const LanguageDropdown = (): JSX.Element => {
  const dispatch = useAppDispatch();

  const languages = [
    {
      name: 'English',
      value: 'en',
      flag: <Us className="w-6" />,
    },
    {
      name: 'Português',
      value: 'pt',
      flag: <Pt className="w-6" />,
    },
    {
      name: 'Japanese',
      value: 'jp',
      flag: <Jp className="w-6" />,
    },
  ];

  return (
    <Menu as="div" className="w-10 h-10">
      <div className="absolute">
        <Button>
          <Menu.Button as="div">
            <Us className="w-6 shadow rounded-sm" />
          </Menu.Button>
        </Button>

        <Menu.Items className="z-20 absolute right-0 bg-white dark:bg-secondaryDark border dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-600 rounded-md shadow-md focus:outline-none">
          {languages.map((language, index) => (
            <Menu.Item
              key={index}
              onClick={() => {
                i18n.changeLanguage(language.value);
              }}
            >
              {({ active }) => (
                <button
                  className={`dark:text-white first:rounded-t-md last:rounded-b-md space-x-2 group flex items-center w-full px-2 py-2 text-sm ${
                    active && 'bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  {language.flag}
                  <p className="font-medium">{language.name}</p>
                </button>
              )}
            </Menu.Item>
          ))}
          {/* ... */}
        </Menu.Items>
      </div>
    </Menu>
  );
};
