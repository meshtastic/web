import '@app/index.css';
import '@core/translation';

import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';

import { RouteProvider } from '@core/router';
import { store } from '@core/store';

import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <RouteProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </RouteProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}
