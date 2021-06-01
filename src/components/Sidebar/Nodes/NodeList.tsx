import React from 'react';

import { useObservableSuspense } from 'observable-hooks';

import type { Types } from '@meshtastic/meshtasticjs';

import { nodeResource } from '../../../streams';
import Node from './Node';

export interface NodeListProps {
  myId: number;
}

const NodeList = (props: NodeListProps): JSX.Element => {
  const nodeSource = useObservableSuspense(nodeResource);

  const [nodes, setNodes] = React.useState<Types.NodeInfoPacket[]>([]);

  React.useEffect(() => {
    if (
      nodes.findIndex(
        (currentNode) => currentNode.data.num === nodeSource.data.num,
      ) >= 0
    ) {
      setNodes(
        nodes.map((currentNode) =>
          currentNode.data.num === nodeSource.data.num
            ? nodeSource
            : currentNode,
        ),
      );
    } else {
      setNodes((nodes) => [...nodes, nodeSource]);
    }
  }, [nodeSource, nodes]);

  return (
    <>
      {nodes.map((node, index) => (
        <Node key={index} node={node} myId={props.myId} />
      ))}
    </>
  );
};

export default NodeList;
