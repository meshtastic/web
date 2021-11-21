import React from 'react';

import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { Select } from '@components/generic/form/Select';
import { connectionUrl } from '@core/connection';

export const HTTP = (): JSX.Element => {
  const [httpIpSource, setHttpIpSource] = React.useState<'local' | 'remote'>(
    'local',
  );

  return (
    <div>
      <Select
        label="Host Source"
        options={[
          {
            name: 'Local',
            value: 'local',
          },
          {
            name: 'Remote',
            value: 'remote',
          },
        ]}
        value={httpIpSource}
        onChange={(e): void => {
          setHttpIpSource(e.target.value as 'local' | 'remote');
        }}
      />
      {httpIpSource === 'local' ? (
        <Input label="Host" value={connectionUrl} disabled />
      ) : (
        <Input label="Host" />
      )}
      <Checkbox label="Use TLS?" />
    </div>
  );
};
