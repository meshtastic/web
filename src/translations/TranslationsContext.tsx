import React from 'react';

import Translations_EN from './en';

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

export interface TranslationsContextData {
  language: LanguageEnum;
  setLanguage: (postId: number) => void;
  translations: languageTemplate;
}

export const translationsContextDefaultValue: TranslationsContextData = {
  language: LanguageEnum.ENGLISH,
  setLanguage: () => null,
  translations: Translations_EN,
};

export const TranslationsContext = React.createContext<TranslationsContextData>(
  translationsContextDefaultValue,
);
