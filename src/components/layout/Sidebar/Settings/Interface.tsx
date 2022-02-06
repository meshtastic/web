import type React from 'react';

import { Select } from '@meshtastic/components';

export const Interface = (): JSX.Element => {
  return (
    <Select
      label="Language"
      options={[
        {
          name: 'English',
          value: 'en',
        },
        {
          name: '日本',
          value: 'jp',
        },
        {
          name: 'Português',
          value: 'pt',
        },
      ]}
      onChange={(e): void => {
        console.log('changed language');
      }}
    />
  );
};
