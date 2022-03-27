import type React from 'react';
import { useEffect, useState } from 'react';

import { m } from 'framer-motion';
import type { Edge, Node } from 'react-flow-renderer';
import ReactFlow, { Background, Controls, MiniMap } from 'react-flow-renderer';
import { BiCrown } from 'react-icons/bi';
import { FiSettings } from 'react-icons/fi';
import { RiMindMap } from 'react-icons/ri';

import { IconButton } from '@components/generic/button/IconButton';
import { Tooltip } from '@components/generic/Tooltip';
import { Layout } from '@components/layout';
import { SidebarItem } from '@components/layout/Sidebar/SidebarItem';
import { Hashicon } from '@emeraldpay/hashicon-react';
import { useAppSelector } from '@hooks/useAppSelector';

export const Nodes = (): JSX.Element => {
  const [graphNodes, setGraphNodes] = useState<Node[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const nodes = useAppSelector((state) => state.meshtastic.nodes);
  const myNodeNum = useAppSelector(
    (state) => state.meshtastic.radio.hardware.myNodeNum,
  );

  useEffect(() => {
    const tmpNodes: Node[] = [];
    // User Terminal
    tmpNodes.push({
      id: '1',
      type: 'input',

      data: { label: 'User Terminal' },
      position: { x: 160 + 500, y: 0 + 500 },
    });

    nodes.map((node, index) => {
      tmpNodes.push({
        id: node.num.toString(),
        data: { label: node.user?.longName ?? `Unknown ${node.num}` },
        position: { x: index * 160 + 500, y: 100 + 500 },
      });
    });

    setGraphNodes(tmpNodes);
  }, [nodes, myNodeNum]);

  useEffect(() => {
    const tmpEdges: Edge[] = [];

    nodes.map((node, index) => {
      if (node.num === myNodeNum) {
        tmpEdges.push({
          id: `e${1}-${myNodeNum}`,
          source: '1',
          target: myNodeNum.toString(),
          type: 'smoothstep',
          style: {
            stroke: 'yellow',
            strokeWidth: 2,
          },
        });
      }

      // node.routes.map((route) => {
      //   tmpEdges.push({
      //     id: `e${route.from}-${route.to}`,
      //     source: node.num.toString(),
      //     target: route.to.toString(),
      //     type: 'smoothstep',
      //     animated: true,
      //   });
      // });
    });

    setGraphEdges(tmpEdges);
  }, [nodes, myNodeNum]);

  return (
    <Layout
      title="Nodes"
      icon={<RiMindMap />}
      sidebarContents={
        <>
          {nodes.map((node) => (
            <SidebarItem
              key={node.num}
              selected={node.num === selected}
              setSelected={(): void => {
                setSelected(node.num);
              }}
              actions={
                <IconButton
                  nested
                  onClick={(e): void => {
                    e.stopPropagation();
                    setSelected(node.num);
                  }}
                  icon={<FiSettings />}
                />
              }
            >
              <div className="flex dark:text-white">
                <div className="relative m-auto">
                  {node.num === myNodeNum && (
                    <Tooltip content="Your Node">
                      <m.div
                        whileHover={{ scale: 1.05 }}
                        className="absolute -right-1 -top-1 rounded-full bg-yellow-500 p-0.5"
                      >
                        <BiCrown className="h-3 w-3" />
                      </m.div>
                    </Tooltip>
                  )}
                  <Hashicon value={node.num.toString()} size={32} />
                </div>
              </div>
              <div className="my-auto mr-auto text-xs font-semibold dark:text-gray-400">
                {node.lastHeard
                  ? new Date(node.lastHeard).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </div>
            </SidebarItem>
          ))}
        </>
      }
    >
      <div className="relative flex h-full w-full">
        <ReactFlow nodes={graphNodes} edges={graphEdges}>
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </Layout>
  );
};
