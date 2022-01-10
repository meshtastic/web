import React from 'react';

import mapbox from 'mapbox-gl';
import { FaSatellite } from 'react-icons/fa';
import { FiCode, FiMapPin } from 'react-icons/fi';
import { GiLightningFrequency } from 'react-icons/gi';
import {
  MdAccountCircle,
  MdArrowDropDown,
  MdArrowDropUp,
  MdGpsFixed,
  MdGpsNotFixed,
  MdGpsOff,
  MdSdStorage,
  MdSignalCellularAlt,
} from 'react-icons/md';
import TimeAgo from 'timeago-react';

import { Marker } from '@components/Map/Marker';
import type { Node } from '@core/slices/meshtasticSlice';
import { Disclosure } from '@headlessui/react';
import { useMapbox } from '@hooks/useMapbox';
import { IconButton } from '@meshtastic/components';
import { Protobuf } from '@meshtastic/meshtasticjs';

type PositionConfidence = 'high' | 'low' | 'none';
type NodeAge = 'young' | 'aging' | 'old' | 'dead';

export interface NodeCardProps {
  node: Node;
  myNodeInfo?: Protobuf.MyNodeInfo;
}

export const NodeCard = ({ node, myNodeInfo }: NodeCardProps): JSX.Element => {
  const [snrAverage, setSnrAverage] = React.useState(0);
  const [satsAverage, setSatsAverage] = React.useState(0);
  const { map } = useMapbox();

  React.useEffect(() => {
    setSnrAverage(
      node.snr
        .slice(node.snr.length - 3, node.snr.length)
        .reduce((a, b) => a + b) / (node.snr.length > 3 ? 3 : node.snr.length),
    );
  }, [node.snr]);
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

  // React.useEffect(() => {
  //   setSatsAverage(
  //     node.positions
  //       .filter((pos) => pos.satsInView !== 0)
  //       .slice(node.positions.length - 3, node.positions.length)
  //       .reduce((a, b) => {
  //         return a.satsInView + b.satsInView;
  //       }).satsInView / (node.positions.length > 3 ? 3 : node.positions.length),
  //   );
  // }, [node.positions]);

  return (
    <>
      {node.currentPosition && (
        <Marker
          center={
            new mapbox.LngLat(
              node.currentPosition.longitudeI / 1e7,
              node.currentPosition.latitudeI / 1e7,
            )
          }
          popup={<div>Popup</div>}
        >
          <div className="z-50 bg-blue-500 border-2 border-blue-500 rounded-full bg-opacity-30">
            <div className="m-4 ">
              <FiMapPin className="w-5 h-5" />
            </div>
          </div>
        </Marker>
      )}

      <Disclosure
        as="div"
        className="m-2 rounded-md shadow-md bg-gray-50 dark:bg-gray-700"
      >
        <Disclosure.Button
          as="div"
          className="flex w-full gap-2 p-2 bg-gray-100 rounded-md shadow-md dark:bg-primaryDark"
        >
          {myNodeInfo ? (
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
            {!myNodeInfo && (
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
        </Disclosure.Button>
        <Disclosure.Panel className="p-2">
          {myNodeInfo && (
            <div>
              <div className="flex justify-between">
                <span className="flex">
                  <MdSdStorage className="my-auto" />
                  Firmware Ver:
                </span>
                <span>{myNodeInfo.firmwareVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex">
                  <GiLightningFrequency className="my-auto" />
                  Freq Bands:
                </span>
                <span>{myNodeInfo.numBands}</span>
              </div>
            </div>
          )}
          <div className="flex">
            <div className="my-auto">
              {Protobuf.HardwareModel[node.user?.hwModel ?? 0]}
            </div>
            <div className="ml-auto">
              <IconButton icon={<FiCode className="w-5 h-5" />} />
            </div>
          </div>
          <div className="flex">
            <MdSignalCellularAlt className="my-auto" />
            SNR:
            {node.snr[node.snr.length - 1] < snrAverage ? (
              <MdArrowDropDown className="text-red-500" />
            ) : (
              <MdArrowDropUp className="text-green-500" />
            )}
            {node.snr[node.snr.length - 1]}, Average: {snrAverage}
          </div>
          <div className="flex">
            <FaSatellite className="my-auto" />
            Sats:
            {(node.currentPosition?.satsInView ?? 0) < satsAverage ? (
              <MdArrowDropDown className="text-red-500" />
            ) : (
              <MdArrowDropUp className="text-green-500" />
            )}
            {node.currentPosition?.satsInView ?? 0}, Average: {satsAverage}
          </div>
        </Disclosure.Panel>
      </Disclosure>
    </>
  );
};
