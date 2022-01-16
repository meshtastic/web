import type React from 'react';

import JSONPretty from 'react-json-pretty';

import { CopyButton } from '@components/menu/buttons/CopyButton';
import type { Node } from '@core/slices/meshtasticSlice';
import { Tab } from '@headlessui/react';

export interface DebugPanelProps {
  node: Node;
}

export const DebugPanel = ({ node }: DebugPanelProps): JSX.Element => {
  return (
    <Tab.Panel className="relative">
      <div className="fixed right-0 m-2">
        <CopyButton data={JSON.stringify(node)} />
      </div>
      <JSONPretty className="max-w-sm" data={node} />
    </Tab.Panel>
  );
};
