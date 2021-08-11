import React from 'react';

import type { Protobuf } from '@meshtastic/meshtasticjs';

import { Node } from '../components/nodes/Node';
import { NodeDetails } from '../components/nodes/NodeDetails';
import { PrimaryTemplate } from '../components/templates/PrimaryTemplate';
import { useAppSelector } from '../hooks/redux';

export const Nodes = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const [currentNode, setCurrentNode] = React.useState<
    Protobuf.NodeInfo | undefined
  >();

  return (
    <PrimaryTemplate title="Administration" tagline="Node">
      <div className="flex w-full space-x-5">
        <div className="w-1/3">
          {nodes.map((node) => (
            <Node
              key={node.num}
              node={node}
              onClick={() => {
                setCurrentNode(node);
              }}
            />
          ))}
        </div>
        <div className="w-2/3">
          {currentNode ? (
            <NodeDetails
              onClose={() => {
                setCurrentNode(undefined);
              }}
              node={currentNode}
            />
          ) : (
            <div>Node not selected</div>
          )}
        </div>
      </div>
    </PrimaryTemplate>
  );
};
