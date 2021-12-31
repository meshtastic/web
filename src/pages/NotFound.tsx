import type React from 'react';

import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { Card } from '@meshtastic/components';

export const NotFound = (): JSX.Element => {
  return (
    <PrimaryTemplate title="Page not found" tagline="404">
      <Card
        title="The requested file or directory could not be found"
        description="Better luck next time"
      >
        <br />
        <br />
      </Card>
    </PrimaryTemplate>
  );
};
