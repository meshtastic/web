import '@app/index.css';

import type React from 'react';
import { StrictMode } from 'react';

import { domAnimation, LazyMotion } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';

import { App } from '@app/App';
import { ErrorFallback } from '@components/ErrorFallback';
import { ReloadPrompt } from '@components/pwa/ReloadPrompt';
import { RouteProvider } from '@core/router';
import { store } from '@core/store';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <StrictMode>
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
  </StrictMode>,
);
