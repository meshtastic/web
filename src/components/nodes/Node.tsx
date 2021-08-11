import React from 'react';

import Avatar from 'boring-avatars';

import type { Protobuf } from '@meshtastic/meshtasticjs';

type DefaultDivProps = JSX.IntrinsicElements['div'];

export interface NodeProps {
  node: Protobuf.NodeInfo;
}

export const Node = ({
  node,
  ...props
}: NodeProps & DefaultDivProps): JSX.Element => {
  return (
    <div
      {...props}
      className="flex space-x-4 items-center w-full rounded-md dark:bg-primaryDark shadow-md border dark:border-gray-600 p-2 mt-6 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-900"
    >
      <Avatar
        size={30}
        name={node.user?.longName ?? 'UNK'}
        variant="beam"
        colors={['#213435', '#46685B', '#648A64', '#A6B985', '#E1E3AC']}
      />
      <div>{node.user?.longName}</div>
    </div>
  );
};
