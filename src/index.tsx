import '@app/index.css';
import '@core/translation';

import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';

import { App } from '@app/App';
import { ReloadPrompt } from '@components/pwa/ReloadPrompt';
import { RouteProvider } from '@core/router';
import { store } from '@core/store';

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
