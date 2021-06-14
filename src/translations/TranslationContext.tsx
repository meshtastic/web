import React from 'react';

import Translations_EN from './en';
import Translations_JP from './jp';
import Translations_PT from './pt';

export interface languageTemplate {
  no_messages_message: string;
  ui_settings_title: string;
  nodes_title: string;
  color_scheme_title: string;
  language_title: string;
  device_settings_title: string;
  device_channels_title: string;
  device_region_title: string;
  device_wifi_ssid: string;
  device_wifi_psk: string;
  save_changes_button: string;
  no_nodes_message: string;
  no_message_placeholder: string;
}

export enum LanguageEnum {
  ENGLISH,
  JAPANESE,
  PORTUGUESE,
}

const Context = React.createContext<{
  language: LanguageEnum;
  setLanguage: React.Dispatch<React.SetStateAction<LanguageEnum>>;
  translations: languageTemplate;
}>({
  language: LanguageEnum.ENGLISH,
  setLanguage: () => {},
  translations: Translations_EN,
});

export const TranslationContext = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const [language, setLanguage] = React.useState<LanguageEnum>(
    LanguageEnum.ENGLISH,
  );
  const [translation, setTranslation] =
    React.useState<languageTemplate>(Translations_EN);
  React.useEffect(() => {
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
  }, [language]);
  return (
    <Context.Provider
      value={{
        language: language,
        setLanguage: setLanguage,
        translations: translation,
      }}
    >
      {children}
    </Context.Provider>
  );
};
