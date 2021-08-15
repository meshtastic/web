import React from 'react';

import { Button } from '@components/generic/Button';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import { MenuIcon } from '@heroicons/react/outline';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface NodeProps {
  navOpen: boolean;
  setNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  node: Protobuf.NodeInfo;
}

export const Node = ({ navOpen, setNavOpen, node }: NodeProps): JSX.Element => {
  return (
    <PrimaryTemplate
      title={node.user?.longName ?? node.num.toString()}
      tagline="Node"
      button={
        <Button
          icon={<MenuIcon className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen(!navOpen);
          }}
          circle
        />
      }
    >
      <div className="w-full max-w-3xl space-y-2 md:max-w-xl">Content</div>
    </PrimaryTemplate>
  );
};
