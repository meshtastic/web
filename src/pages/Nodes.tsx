import React from 'react';

import { Node } from '../components/nodes/Node';
import { PrimaryTemplate } from '../components/templates/PrimaryTemplate';
import { useAppSelector } from '../hooks/redux';

export const Nodes = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);

  return (
    <PrimaryTemplate title="Administration" tagline="Node">
      {nodes.map((node) => (
        <Node key={node.num} node={node} />
      ))}
    </PrimaryTemplate>
  );
};
