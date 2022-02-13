import React from 'react';

import { FiSettings } from 'react-icons/fi';

import { SidebarItem } from '@components/layout/Sidebar/SidebarItem';
import type { Node } from '@core/slices/meshtasticSlice';
import { Hashicon } from '@emeraldpay/hashicon-react';
import { IconButton } from '@meshtastic/components';

export interface DmChatProps {
  node: Node;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}

export const DmChat = ({
  node,
  selectedIndex,
  setSelectedIndex,
}: DmChatProps): JSX.Element => {
  return (
    <SidebarItem
      key={node.number}
      selected={node.number === selectedIndex}
      setSelected={(): void => {
        setSelectedIndex(node.number);
      }}
      actions={<IconButton icon={<FiSettings />} />}
    >
      <div className="flex dark:text-white">
        <div className="m-auto">
          <Hashicon value={node.number.toString()} size={32} />
        </div>
      </div>
      <div className="my-auto mr-auto font-semibold dark:text-white">
        {node.user?.longName ?? 'Unknown'}
      </div>
    </SidebarItem>
  );
};
