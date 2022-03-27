import type React from 'react';

import { FiSettings } from 'react-icons/fi';

import { IconButton } from '@components/generic/button/IconButton';
import { SidebarItem } from '@components/layout/Sidebar/SidebarItem';
import { Hashicon } from '@emeraldpay/hashicon-react';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface DmChatProps {
  node: Protobuf.NodeInfo;
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
      key={node.num}
      selected={node.num === selectedIndex}
      setSelected={(): void => {
        setSelectedIndex(node.num);
      }}
      actions={<IconButton nested icon={<FiSettings />} />}
    >
      <div className="flex dark:text-white">
        <div className="m-auto">
          <Hashicon value={node.num.toString()} size={32} />
        </div>
      </div>
      <div className="my-auto mr-auto font-semibold dark:text-white">
        {node.user?.longName ?? 'Unknown'}
      </div>
    </SidebarItem>
  );
};
