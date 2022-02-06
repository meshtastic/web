import type React from 'react';

import { CopyButton } from '@components/menu/buttons/CopyButton';
import type { Node } from '@core/slices/meshtasticSlice';

export interface PositionPanelProps {
  node: Node;
}

export const PositionPanel = ({ node }: PositionPanelProps): JSX.Element => {
  return (
    <div className="p-2">
      {node.currentPosition && (
        <div className="flex h-10 select-none justify-between rounded-md border border-gray-300 bg-transparent bg-gray-200 px-1 text-gray-500 dark:border-gray-600 dark:bg-secondaryDark dark:text-gray-400 ">
          <div className="my-auto px-1">
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
    </div>
  );
};
