import 'react-json-pretty/themes/acai.css';

import React from 'react';

import { FiCode, FiMenu } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';
import TimeAgo from 'timeago-react';

import { Cover } from '@app/components/generic/Cover';
import { useAppSelector } from '@app/hooks/redux';
import { Card } from '@components/generic/Card';
import { Checkbox } from '@components/generic/form/Checkbox';
import { Input } from '@components/generic/form/Input';
import { IconButton } from '@components/generic/IconButton';
import { StatCard } from '@components/generic/StatCard';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface NodeProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  node: Protobuf.NodeInfo;
}

export const Node = ({ navOpen, setNavOpen, node }: NodeProps): JSX.Element => {
  const user = useAppSelector((state) => state.meshtastic.users).find(
    (user) => user.packet.from === node.num,
  )?.data;
  const position = useAppSelector(
    (state) => state.meshtastic.positionPackets,
  ).find((position) => position.packet.from === node.num)?.data;
  const [debug, setDebug] = React.useState(false);
  return (
    <PrimaryTemplate
      title={user ? user.longName : node.num.toString()}
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
      footer={<></>}
    >
      <div className="w-full space-y-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <StatCard
            title="Last heard"
            value={
              node.lastHeard ? (
                <TimeAgo datetime={new Date(node.lastHeard * 1000)} />
              ) : (
                'Never'
              )
            }
          />
          <StatCard title="SNR" value={node.snr.toString()} />
        </div>
        <Card
          title="Position"
          description={new Date(node.lastHeard * 1000).toLocaleString()}
        >
          <Cover enabled={debug} content={<JSONPretty data={node} />} />
          <div className="p-10">
            <JSONPretty data={position} />
          </div>
        </Card>
        <Card title="Settings" description="Remote node settings">
          <div className="p-10">
            <form className="space-y-4">
              <Input label="Device Name" />
              <Input label="Short Name" maxLength={3} />
              <Checkbox label="Licenced Operator?" />
            </form>
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
