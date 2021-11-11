import '@app/index.css';
import '@core/translation';

import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';

import { RouteProvider } from '@core/router';
import { store } from '@core/store';

import App from './App';
import ReloadPrompt from './components/pwa/ReloadPrompt';

ReactDOM.render(
  <React.StrictMode>
    <RouteProvider>
      <Provider store={store}>
        <App />
        <ReloadPrompt />
      </Provider>
    </RouteProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
