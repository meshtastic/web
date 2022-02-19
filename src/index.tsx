import '@app/index.css';

import React from 'react';
import ReactDOM from 'react-dom';

import { domAnimation, LazyMotion } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';

import { App } from '@app/App';
import { ErrorFallback } from '@components/ErrorFallback';
import { ReloadPrompt } from '@components/pwa/ReloadPrompt';
import { RouteProvider } from '@core/router';
import { store } from '@core/store';

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
