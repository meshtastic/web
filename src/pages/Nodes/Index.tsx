import React from 'react';

import Avatar from 'boring-avatars';

import { useAppSelector } from '@app/hooks/redux';
import { PageLayout } from '@components/templates/PageLayout';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { Node } from './Node';

export const Nodes = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);

  return (
    <PageLayout
      title="Nodes"
      emptyMessage="No nodes discovered yet..."
      sidebarItems={nodes.map((node) => {
        return {
          title: node.user?.longName ?? node.num.toString(),
          description: node.user?.hwModel
            ? Protobuf.HardwareModel[node.user.hwModel]
            : 'Unknown Hardware',
          icon: (
            <Avatar
              size={30}
              name={node.user?.longName ?? node.num.toString()}
              variant="beam"
              colors={['#213435', '#46685B', '#648A64', '#A6B985', '#E1E3AC']}
            />
          ),
        };
      })}
      panels={nodes.map((node, index) => (
        <Node key={index} node={node} />
      ))}
    />
  );
};
