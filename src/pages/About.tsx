import React from 'react';

import { PrimaryTemplate } from '../components/templates/PrimaryTemplate';
import { TestForm } from '../components/TestForm';

export const About = (): JSX.Element => {
  return (
    <PrimaryTemplate title="meshtastic-web" tagline="About">
      <p>Content</p>
      <TestForm />
    </PrimaryTemplate>
  );
};
