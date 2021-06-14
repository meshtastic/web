import './index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';
import { TranslationContext } from './translations/TranslationContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <TranslationContext>
      <App />
    </TranslationContext>
  </React.StrictMode>,
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
