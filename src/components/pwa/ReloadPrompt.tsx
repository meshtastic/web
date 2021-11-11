import './ReloadPrompt.css';

// eslint-disable-next-line no-use-before-define
import type React from 'react';

import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt = (): JSX.Element => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // eslint-disable-next-line prefer-template
      console.log(`SW Registered:`, r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = (): void => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="ReloadPrompt-container">
      {(offlineReady || needRefresh) && (
        <div className="ReloadPrompt-toast">
          <div className="ReloadPrompt-message">
            {offlineReady ? (
              <span>App ready to work offline</span>
            ) : (
              <span>
                New content available, click on reload button to update.
              </span>
            )}
          </div>
          {needRefresh && (
            <button
              className="ReloadPrompt-toast-button"
              onClick={(): Promise<void> => updateServiceWorker(true)}
            >
              Reload
            </button>
          )}
          <button
            className="ReloadPrompt-toast-button"
            onClick={(): void => close()}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ReloadPrompt;
