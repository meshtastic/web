import type React from 'react';

import { Card } from '@app/components/generic/Card';

export const NotFound = (): JSX.Element => {
  return (
    <Card>
      <h3>The requested file or directory could not be found</h3>
      <h4>Better luck next time</h4>
      <br />
      <br />
    </Card>
  );
};
