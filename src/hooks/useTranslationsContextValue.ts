import React from 'react';

import Translations_EN from '../translations/en';
import Translations_JP from '../translations/jp';
import Translations_PT from '../translations/pt';
import type {
  languageTemplate,
  TranslationsContextData,
} from '../translations/TranslationsContext';
import { LanguageEnum } from '../translations/TranslationsContext';

export const useTranslationsContextValue = (): TranslationsContextData => {
  const [currentLanguage, setcurrentLanguage] = React.useState<LanguageEnum>(
    LanguageEnum.ENGLISH,
  );
  const [translation, setTranslation] =
    React.useState<languageTemplate>(Translations_EN);

  const setLanguage = React.useCallback(
    (language: LanguageEnum) => {
      setcurrentLanguage(language);
      switch (language) {
        case LanguageEnum.ENGLISH:
          setTranslation(Translations_EN);
          break;
        case LanguageEnum.JAPANESE:
          setTranslation(Translations_JP);
          break;
        case LanguageEnum.PORTUGUESE:
          setTranslation(Translations_PT);
          break;
      }
    },
    [setcurrentLanguage, setTranslation],
  );

  return {
    language: currentLanguage,
    setLanguage: setLanguage,
    translations: translation,
  };
};
