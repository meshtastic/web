import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
} from '@heroicons/react/outline';
import type { Types } from '@meshtastic/meshtasticjs';

import type { languageTemplate } from '../../../App';
import Node from './Node';

interface NodesProps {
  isReady: boolean;
  nodes: Types.NodeInfoPacket[];
  translations: languageTemplate;
  myId: number;
}

const Nodes = (props: NodesProps) => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex rounded-t-md w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex">
              {open ? (
                <ChevronDownIcon className="my-auto w-5 h-5 mr-2" />
              ) : (
                <ChevronRightIcon className="my-auto w-5 h-5 mr-2" />
              )}
              <UsersIcon className="my-auto text-gray-600 mr-2 w-5 h-5" />
              {props.translations.nodes_title}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel className="shadow-inner">
            {props.nodes.length ? (
              props.nodes.map((node, index) => (
                <Node key={index} node={node} myId={props.myId} />
              ))
            ) : (
              <div className="flex border-b border-gray-300">
                <div className="m-auto p-3 text-gray-500">
                  {props.translations.no_nodes_message}
                </div>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Nodes;
