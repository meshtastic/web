import React from 'react';

import mapbox from 'mapbox-gl';
import { FiAlignLeft } from 'react-icons/fi';
import {
  MdAccountCircle,
  MdGpsFixed,
  MdGpsNotFixed,
  MdGpsOff,
} from 'react-icons/md';
import TimeAgo from 'timeago-react';

import type { Node } from '@core/slices/meshtasticSlice';
import { useMapbox } from '@hooks/useMapbox';
import { IconButton } from '@meshtastic/components';

type PositionConfidence = 'high' | 'low' | 'none';
type NodeAge = 'young' | 'aging' | 'old' | 'dead';

export interface NodeCardProps {
  node: Node;
  isMyNode?: boolean;
  setSelected: () => void;
}

export const NodeCard = ({
  node,
  isMyNode,
  setSelected,
}: NodeCardProps): JSX.Element => {
  const { map } = useMapbox();

  // React.useEffect(() => {
  //   setSnrAverage(
  //     node.snr
  //       .slice(node.snr.length - 3, node.snr.length)
  //       .reduce((a, b) => a + b) / (node.snr.length > 3 ? 3 : node.snr.length),
  //   );
  // }, [node.snr]);
  const [PositionConfidence, setPositionConfidence] =
    React.useState<PositionConfidence>('none');
  const [age, setAge] = React.useState<NodeAge>('young');

  React.useEffect(() => {
    setAge(
      node.lastHeard > new Date(Date.now() - 1000 * 60 * 15)
        ? 'young'
        : node.lastHeard > new Date(Date.now() - 1000 * 60 * 30)
        ? 'aging'
        : node.lastHeard > new Date(Date.now() - 1000 * 60 * 60)
        ? 'old'
        : 'dead',
    );
  }, [node.lastHeard]);

  React.useEffect(() => {
    setPositionConfidence(
      node.currentPosition
        ? new Date(node.currentPosition.posTimestamp * 1000) >
          new Date(new Date().getTime() - 1000 * 60 * 30)
          ? 'high'
          : 'low'
        : 'none',
    );
  }, [node.currentPosition]);
  return (
    <div className="m-2 rounded-md shadow-md bg-gray-50 dark:bg-gray-700">
      <div className="flex w-full gap-1 p-2 bg-gray-100 rounded-md shadow-md dark:bg-primaryDark">
        {isMyNode ? (
          <MdAccountCircle className="my-auto" />
        ) : (
          <div
            className={`my-auto w-3 h-3 rounded-full ${
              age === 'young'
                ? 'bg-green-500'
                : age === 'aging'
                ? 'bg-yellow-500'
                : age === 'old'
                ? 'bg-red-500'
                : 'bg-gray-500'
            }`}
          />
        )}
        <div className="my-auto">{node.user?.longName}</div>

        <div className="my-auto ml-auto text-xs font-semibold">
          {!isMyNode && (
            <span>
              {node.lastHeard.getTime() ? (
                <TimeAgo datetime={node.lastHeard} />
              ) : (
                'Never'
              )}
            </span>
          )}
        </div>
        <IconButton
          disabled={PositionConfidence === 'none'}
          onClick={(e): void => {
            e.stopPropagation();
            if (PositionConfidence !== 'none' && node.currentPosition) {
              map?.flyTo({
                center: new mapbox.LngLat(
                  node.currentPosition.longitudeI / 1e7,
                  node.currentPosition.latitudeI / 1e7,
                ),
                zoom: 16,
              });
            }
          }}
          icon={
            PositionConfidence === 'high' ? (
              <MdGpsFixed />
            ) : PositionConfidence === 'low' ? (
              <MdGpsNotFixed />
            ) : (
              <MdGpsOff />
            )
          }
        />
        <IconButton
          onClick={(): void => {
            setSelected();
          }}
          icon={<FiAlignLeft />}
        />
        {/* <FiBatteryCharging /> */}
      </div>
    </div>
  );
};
