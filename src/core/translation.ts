import i18n from 'i18next';
import detector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { en } from '../translations/en';
import { jp } from '../translations/jp';
import { pt } from '../translations/pt';

void i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      jp: { translation: jp },
      pt: { translation: pt },
    },
  });

export default i18n;
