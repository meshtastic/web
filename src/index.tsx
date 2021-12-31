import '@meshtastic/components/dist/style.css';
import '@app/index.css';
import '@core/translation';

import React from 'react';
import ReactDOM from 'react-dom';

import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';

import { App } from '@app/App';
import { ReloadPrompt } from '@components/pwa/ReloadPrompt';
import { RouteProvider } from '@core/router';
import { store } from '@core/store';

import { ErrorFallback } from './components/ErrorFallback';

ReactDOM.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouteProvider>
        <Provider store={store}>
          <App />
          <ReloadPrompt />
        </Provider>
      </RouteProvider>
    </ErrorBoundary>
  </React.StrictMode>,
  document.getElementById('root'),
);
