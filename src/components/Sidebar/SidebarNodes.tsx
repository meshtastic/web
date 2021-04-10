import React from 'react';

import { FaDesktop, FaUsers } from 'react-icons/fa';

import type { Types } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../App';
import NavItem from '../NavItem';

interface sidebarNodesProps {
  IsReady: boolean;
  Nodes: Types.NodeInfoPacket[];
  Translations: languageTemplate;
}

const SidebarNodes = (props: sidebarNodesProps) => {
  return (
    <NavItem
      isDropdown={true}
      open={false}
      isNested={false}
      titleContent={
        <div className="flex">
          <FaUsers className="my-auto mr-2" />
          {props.Translations.nodes_title}
          <div className="flex m-auto rounded-full bg-gray-300 w-6 h-6 text-sm ml-2">
            <div className="m-auto">{props.Nodes.length ?? 0}</div>
          </div>
        </div>
      }
      isLoading={!props.IsReady}
      dropdownContent={
        props.Nodes.length ? (
          props.Nodes.map((node, index) => (
            <NavItem
              key={index}
              isDropdown={true}
              isNested={true}
              open={false}
              titleContent={
                <div key={index} className="flex">
                  <FaDesktop className="my-auto mr-2" />
                  <div className="m-auto">{node.data.user?.longName}</div>
                </div>
              }
              dropdownContent={
                <NavItem
                  isDropdown={false}
                  isNested={true}
                  titleContent={
                    <div>
                      <p>
                        SNR:{' '}
                        {node.packet?.rxSnr ? node.packet.rxSnr : 'Unknown'}
                      </p>
                      <p>
                        RSSI:{' '}
                        {node.packet?.rxRssi ? node.packet.rxRssi : 'Unknown'}
                      </p>
                      <p>
                        Last heard:{' '}
                        {node.data?.lastHeard ? node.data.lastHeard : 'Unknown'}
                      </p>
                      <p>
                        Loc:{' '}
                        {node.data?.position
                          ? `alt: ${node.data?.position.altitude}, lat: ${node.data?.position.latitudeI}, lng: ${node.data?.position.longitudeI}, time: ${node.data?.position.time}, batt: ${node.data?.position.batteryLevel}`
                          : 'Unknown'}
                      </p>
                    </div>
                  }
                />
              }
            />
          ))
        ) : (
          <div className="flex border-b border-gray-300">
            <div className="m-auto p-3 text-gray-500">
              {props.Translations.no_nodes_message}
            </div>
          </div>
        )
      }
    />
  );
};

export default SidebarNodes;
