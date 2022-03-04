import type React from 'react';

import { Button } from '@components/generic/button/Button';
import { Card } from '@components/generic/Card';
import { connection } from '@core/connection';
import { useAppSelector } from '@hooks/useAppSelector';

export const Debug = (): JSX.Element => {
  const hardwareInfo = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  );
  const node = useAppSelector((state) =>
    state.meshtastic.nodes.find(
      (node) => node.number === hardwareInfo.myNodeNum,
    ),
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row">
      <Card className="flex-grow">
        <div className="grid grid-cols-4 gap-4">
          <Button
            onClick={async (): Promise<void> => {
              await connection.configure();
            }}
          >
            Configure
          </Button>
          <Button
            onClick={async (): Promise<void> => {
              await connection.getPreferences();
            }}
          >
            Get Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
};
