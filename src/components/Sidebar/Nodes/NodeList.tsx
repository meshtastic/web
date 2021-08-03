import React from 'react';

import { useAppSelector } from '../../../hooks/redux';
import { Node } from './Node';

export const NodeList = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);

  return (
    <>
      {nodes.map((node, index) => (
        <Node key={index} node={node} />
      ))}
    </>
  );
};
