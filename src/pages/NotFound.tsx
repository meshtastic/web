import React from 'react';

import { Card } from '@app/components/generic/Card';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';

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
