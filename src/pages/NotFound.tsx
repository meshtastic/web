import type React from 'react';

import { Card } from '@meshtastic/components';

export const NotFound = (): JSX.Element => {
  return (
    <Card
      title="The requested file or directory could not be found"
      description="Better luck next time"
    >
      <br />
      <br />
    </Card>
  );
};
