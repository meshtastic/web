import type React from 'react';

import { CopyButton } from '@components/menu/buttons/CopyButton';
import type { Node } from '@core/slices/meshtasticSlice';
import { Tab } from '@headlessui/react';

export interface PositionPanelProps {
  node: Node;
}

export const PositionPanel = ({ node }: PositionPanelProps): JSX.Element => {
  return (
    <Tab.Panel className="p-2">
      {node.currentPosition && (
        <div className="flex justify-between h-10 px-1 text-gray-500 bg-transparent bg-gray-200 border border-gray-300 rounded-md select-none dark:border-gray-600 dark:bg-secondaryDark dark:text-gray-400 ">
          <div className="px-1 my-auto">
            {(node.currentPosition.latitudeI / 1e7).toPrecision(6)},&nbsp;
            {(node.currentPosition?.longitudeI / 1e7).toPrecision(6)}
          </div>
          <CopyButton
            data={
              node.currentPosition
                ? `${node.currentPosition.latitudeI / 1e7},${
                    node.currentPosition.longitudeI / 1e7
                  }`
                : ''
            }
          />
        </div>
      )}
    </Tab.Panel>
  );
};
