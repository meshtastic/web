import React from 'react';

import Translations_English from './en';

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

export const TranslationContext = React.createContext({
  language: LanguageEnum.ENGLISH,
  translations: Translations_English,
});

// const TranslationProvider: React.FC = ({ children }) => {
//   const [language, setLanguage] = React.useState<LanguageEnum>(
//     LanguageEnum.ENGLISH,
//   );
//   return { children };
// };

// export default TranslationProvider;
