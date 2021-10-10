import React from 'react';

import { Card } from '@app/components/generic/Card';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';

export const About = (): JSX.Element => {
  return (
    <PrimaryTemplate title="meshtastic-web" tagline="About">
      <Card title="Project desc" description="...">
        <p className="p-10">Content</p>
      </Card>
    </PrimaryTemplate>
  );
};
