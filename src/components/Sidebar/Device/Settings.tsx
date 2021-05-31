import React from 'react';

import type {
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
} from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../../../src/App';
import SettingsForm from './SettingsForm';

export interface SettingsProps {
  isReady: boolean;
  connection: ISerialConnection | IHTTPConnection | IBLEConnection;
  translations: languageTemplate;
}

const Settings = (props: SettingsProps): JSX.Element => {
  return (
    <React.Suspense fallback={<div>Loading....</div>}>
      <SettingsForm
        connection={props.connection}
        isReady={props.isReady}
        translations={props.translations}
      />
    </React.Suspense>
  );
};

export default Settings;
