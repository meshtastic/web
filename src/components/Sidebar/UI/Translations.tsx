import React from 'react';

import { Br, Jp, Us } from 'react-flags-select';

import { Disclosure } from '@headlessui/react';

import { LanguageEnum, languageTemplate } from '../../../App';

export interface TranslationsProps {
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  translations: languageTemplate;
}

const Translations = (props: TranslationsProps) => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex my-auto">
              {props.translations.language_title}
              <div className="my-auto">
                {props.language === LanguageEnum.ENGLISH ? (
                  <Us className="ml-2 w-8 shadow-md" />
                ) : props.language === LanguageEnum.JAPANESE ? (
                  <Jp className="ml-2 w-8 shadow-md" />
                ) : null}
              </div>
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <div>
              English <Us className="w-8 shadow-md" />
            </div>
            <div>
              Português <Br className="w-8 shadow-md" />
            </div>
            <div>
              日本語 <Jp className="w-8 shadow-md" />
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Translations;
