import './index.css';
import './translation';

import React from 'react';
import ReactDOM from 'react-dom';

import { Provider } from 'react-redux';

import App from './App';
import { RouteProvider } from './router';
import { store } from './store';

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
