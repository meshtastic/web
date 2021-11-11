import type React from 'react';

import Avatar from 'boring-avatars';

import { useAppSelector } from '@app/hooks/redux';
import { PageLayout } from '@components/templates/PageLayout';
import { Protobuf } from '@meshtastic/meshtasticjs';

import { Node } from './Node';

export const Nodes = (): JSX.Element => {
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const users = useAppSelector((state) => state.meshtastic.users);
  return (
    <PageLayout
      title="Nodes"
      emptyMessage="No nodes discovered yet..."
      sidebarItems={nodes.map((node) => {
        const user = users.find((user) => user.packet.from === node.num)?.data;
        return {
          title: user ? user.longName : node.num.toString(),
          description: user
            ? Protobuf.HardwareModel[user.hwModel]
            : 'Unknown Hardware',
          icon: (
            <Avatar
              size={30}
              name={user ? user.longName : node.num.toString()}
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
