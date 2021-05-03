import React from 'react';

import {
  ClockIcon,
  DesktopComputerIcon,
  FlagIcon,
  GlobeIcon,
  LightningBoltIcon,
  UsersIcon,
} from '@heroicons/react/outline';
import type { Types } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../App';
import NavItem from '../NavItem';

interface sidebarNodesProps {
  IsReady: boolean;
  Nodes: Types.NodeInfoPacket[];
  Translations: languageTemplate;
  myId: number;
}

const SidebarNodes = (props: sidebarNodesProps) => {
  return (
    <NavItem
      isDropdown={true}
      open={false}
      isNested={false}
      titleContent={
        <div className="flex">
          <UsersIcon className="my-auto mr-2 w-5 h-5" />
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
                  {node.data.num === props.myId ? (
                    <FlagIcon className="text-yellow-500 my-auto mr-2 w-5 h-5" />
                  ) : (
                    <DesktopComputerIcon className="my-auto mr-2 w-5 h-5" />
                  )}
                  <div className="m-auto">{node.data.user?.longName}</div>
                </div>
              }
              dropdownContent={
                <NavItem
                  isDropdown={false}
                  isNested={true}
                  open={false}
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
                        {`Last heard: ${
                          node.data?.lastHeard
                            ? new Date(node.data.lastHeard).toLocaleString()
                            : 'Unknown'
                        }`}{' '}
                        {}
                      </p>
                      <div className="flex">
                        <GlobeIcon className="my-auto mr-2 w-5 h-5" />
                        <p>
                          {
                            node.data.position?.latitudeI &&
                            node.data.position?.longitudeI
                              ? `${node.data.position.latitudeI / 1e7}, 
                                ${node.data.position.longitudeI / 1e7}` 
                                : 'Unknown'
                          }
                        </p>
                      </div>

                      <div className="flex">
                        <GlobeIcon className="my-auto mr-2 w-5 h-5" />
                        <p>{node.data.position?.altitude}</p>
                      </div>

                      <div className="flex">
                        <ClockIcon className="my-auto mr-2 w-5 h-5" />
                        <p>{node.data.position?.time}</p>
                      </div>
                      <div className="flex">
                        <LightningBoltIcon className="my-auto mr-2 w-5 h-5" />
                        <p>{node.data.position?.batteryLevel}</p>
                      </div>
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
