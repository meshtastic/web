import React from 'react';

import mapbox from 'mapbox-gl';
import {
  FiAlignLeft,
  FiCode,
  FiMapPin,
  FiSliders,
  FiUser,
} from 'react-icons/fi';
import { IoTelescope } from 'react-icons/io5';
import { MdGpsFixed, MdGpsNotFixed, MdGpsOff } from 'react-icons/md';
import JSONPretty from 'react-json-pretty';

import { CollapsibleSection } from '@app/components/layout/Sidebar/sections/CollapsibleSection';
import { SidebarOverlay } from '@app/components/layout/Sidebar/sections/SidebarOverlay';
import { SidebarItem } from '@app/components/layout/Sidebar/SidebarItem';
import { CopyButton } from '@app/components/menu/buttons/CopyButton';
import type { Node } from '@core/slices/meshtasticSlice';
import { useMapbox } from '@hooks/useMapbox';
import { IconButton } from '@meshtastic/components';
// eslint-disable-next-line import/no-unresolved
import skypack_hashicon from '@skypack/@emeraldpay/hashicon-react';

const Hashicon = skypack_hashicon.Hashicon;

type PositionConfidence = 'high' | 'low' | 'none';

export interface NodeCardProps {
  node: Node;
  isMyNode: boolean;
  selected: boolean;
  setSelected: () => void;
}

export const NodeCard = ({
  node,
  isMyNode,
  selected,
  setSelected,
}: NodeCardProps): JSX.Element => {
  const { map } = useMapbox();
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [PositionConfidence, setPositionConfidence] =
    React.useState<PositionConfidence>('none');

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
    <SidebarItem
      selected={selected}
      setSelected={setSelected}
      actions={
        <>
          <IconButton
            disabled={PositionConfidence === 'none'}
            onClick={(e): void => {
              e.stopPropagation();
              setSelected();
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
            onClick={(e): void => {
              e.stopPropagation();
              setInfoOpen(true);
            }}
            icon={<FiAlignLeft />}
          />
        </>
      }
    >
      <div className="flex dark:text-white">
        <div className="m-auto">
          <Hashicon value={node.number.toString()} size={32} />
        </div>
      </div>
      <div className="my-auto mr-auto text-xs font-semibold dark:text-gray-400">
        {node.lastHeard.getTime()
          ? node.lastHeard.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Never'}
      </div>
      <SidebarOverlay
        title={`Node ${node.user?.longName ?? 'UNK'} `}
        open={infoOpen}
        close={(): void => {
          setInfoOpen(false);
        }}
        direction="x"
      >
        <CollapsibleSection title="User" icon={<FiUser />}>
          <div>Info</div>
        </CollapsibleSection>
        <CollapsibleSection title="Location" icon={<FiMapPin />}>
          <div>Info</div>
        </CollapsibleSection>
        <CollapsibleSection title="Line of Sight" icon={<IoTelescope />}>
          <div>Info</div>
        </CollapsibleSection>
        <CollapsibleSection title="Administration" icon={<FiSliders />}>
          <div>Info</div>
        </CollapsibleSection>
        <CollapsibleSection title="Debug" icon={<FiCode />}>
          <>
            <div className="fixed right-0 mr-6">
              <CopyButton data={JSON.stringify(node)} />
            </div>
            <JSONPretty className="max-w-sm" data={node} />
          </>
        </CollapsibleSection>
      </SidebarOverlay>
    </SidebarItem>
  );
};
