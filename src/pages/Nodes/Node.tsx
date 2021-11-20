import 'react-json-pretty/themes/acai.css';

import React from 'react';

import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';
import TimeAgo from 'timeago-react';

import { Card } from '@components/generic/Card';
import { Cover } from '@components/generic/Cover';
import { IconButton } from '@components/generic/IconButton';
import { StatCard } from '@components/generic/StatCard';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import type { Node as NodeType } from '@core/slices/meshtasticSlice';

export interface NodeProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  node: NodeType;
}

export const Node = ({ navOpen, setNavOpen, node }: NodeProps): JSX.Element => {
  const [debug, setDebug] = React.useState(false);
  return (
    <PrimaryTemplate
      title={node.user?.longName ?? node.number.toString()}
      tagline="Node"
      leftButton={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
      rightButton={
        <IconButton
          icon={<FiCode className="w-5 h-5" />}
          active={debug}
          onClick={(): void => {
            setDebug(!debug);
          }}
        />
      }
    >
      <div className="w-full space-y-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <StatCard
            title="Last heard"
            value={
              node.lastHeard ? <TimeAgo datetime={node.lastHeard} /> : 'Never'
            }
          />
          <StatCard title="SNR" value={node.snr.toString()} />
        </div>
        <Card title="Position" description={node.lastHeard.toLocaleString()}>
          <Cover enabled={debug} content={<JSONPretty data={node} />} />
          <div className="p-10">
            <JSONPretty data={node.positions[node.positions.length - 1]} />
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
