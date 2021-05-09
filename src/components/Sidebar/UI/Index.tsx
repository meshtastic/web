import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CogIcon,
} from '@heroicons/react/outline';

import type { LanguageEnum, languageTemplate } from '../../../App';
import Translations from './Translations';

interface UIProps {
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  translations: languageTemplate;
  darkmode: boolean;
  setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
}

const UI = (props: UIProps) => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex">
              <CogIcon className="my-auto mr-2 w-5 h-5" />
              {props.translations.ui_settings_title}
            </div>
            {open ? (
              <ChevronDownIcon className="my-auto group-hover:text-gray-700 w-5 h-5" />
            ) : (
              <ChevronRightIcon className="my-auto group-hover:text-gray-700 w-5 h-5" />
            )}
          </Disclosure.Button>
          <Disclosure.Panel>
            <Translations
              language={props.language}
              setLanguage={props.setLanguage}
              translations={props.translations}
            />
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default UI;
