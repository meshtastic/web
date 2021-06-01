/// <reference types="react/experimental" />
/// <reference types="react-dom/experimental" />

import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import Translations_English from './translations/en';
import {
  LanguageEnum,
  TranslationContext,
} from './translations/TranslationContext';

const element = document.getElementById('root');

if (element) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <TranslationContext.Provider
        value={{
          language: LanguageEnum.ENGLISH,
          translations: Translations_English,
        }}
      >
        <App />
      </TranslationContext.Provider>
    </React.StrictMode>,
  );
}

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
