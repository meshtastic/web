import React from 'react';

import { Br, Jp, Us } from 'react-flags-select';

import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/outline';

import type { languageTemplate } from '../../../App';
import { LanguageEnum } from '../../../App';

export interface TranslationsProps {
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  translations: languageTemplate;
}

const Translations = (props: TranslationsProps): JSX.Element => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex bg-gray-50 w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex ml-4">
              {open ? (
                <ChevronDownIcon className="my-auto w-5 h-5 mr-2" />
              ) : (
                <ChevronRightIcon className="my-auto w-5 h-5 mr-2" />
              )}
              {props.translations.language_title}
              <div className="my-auto">
                {props.language === LanguageEnum.ENGLISH ? (
                  <Us className="ml-2 w-8" />
                ) : props.language === LanguageEnum.JAPANESE ? (
                  <Jp className="ml-2 w-8" />
                ) : props.language === LanguageEnum.PORTUGUESE ? (
                  <Br className="ml-2 w-8" />
                ) : null}
              </div>
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <div
              className="flex bg-gray-100 hover:bg-gray-200 cursor-pointer justify-between p-2"
              onClick={() => {
                props.setLanguage(LanguageEnum.ENGLISH);
              }}
            >
              English <Us className="w-8 my-auto" />
            </div>
            <div
              className="flex bg-gray-100 hover:bg-gray-200 cursor-pointer justify-between p-2"
              onClick={() => {
                props.setLanguage(LanguageEnum.PORTUGUESE);
              }}
            >
              Português <Br className="w-8 my-auto" />
            </div>
            <div
              className="flex bg-gray-100 hover:bg-gray-200 cursor-pointer justify-between p-2"
              onClick={() => {
                props.setLanguage(LanguageEnum.JAPANESE);
              }}
            >
              日本語 <Jp className="w-8 my-auto" />
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Translations;
