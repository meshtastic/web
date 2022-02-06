import '@meshtastic/components/dist/style.css';
import '@app/index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { domAnimation, LazyMotion } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';

import { App } from '@app/App';
import { ReloadPrompt } from '@components/pwa/ReloadPrompt';
import { store } from '@core/store';

import { ErrorFallback } from './components/ErrorFallback';
import { RouteProvider } from './core/router';

ReactDOM.render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <RouteProvider>
        <Provider store={store}>
          <LazyMotion features={domAnimation}>
            <App />
          </LazyMotion>
          <ReloadPrompt />
        </Provider>
      </RouteProvider>
    </ErrorBoundary>
  </React.StrictMode>,
  document.getElementById('root'),
);
