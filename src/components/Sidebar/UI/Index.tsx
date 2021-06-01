import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CogIcon,
} from '@heroicons/react/outline';

import type { LanguageEnum } from '../../../translations/TranslationContext';
import { TranslationContext } from '../../../translations/TranslationContext';
import Translations from './Translations';

interface UIProps {
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  darkmode: boolean;
  setDarkmode: React.Dispatch<React.SetStateAction<boolean>>;
}

const UI = (props: UIProps): JSX.Element => {
  const { translations } = React.useContext(TranslationContext);
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex">
              {open ? (
                <ChevronDownIcon className="my-auto w-5 h-5 mr-2" />
              ) : (
                <ChevronRightIcon className="my-auto w-5 h-5 mr-2" />
              )}
              <CogIcon className="my-auto text-gray-600 mr-2 w-5 h-5" />
              {translations.ui_settings_title}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <Translations
              language={props.language}
              setLanguage={props.setLanguage}
            />
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default UI;
