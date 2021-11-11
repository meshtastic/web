import 'react-json-pretty/themes/acai.css';

import type React from 'react';

import { FiMenu, FiTerminal } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';
import TimeAgo from 'react-timeago';

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
  return (
    <PrimaryTemplate
      title={user ? user.longName : node.num.toString()}
      tagline="Node"
      button={
        <IconButton
          icon={<FiMenu className="w-5 h-5" />}
          onClick={(): void => {
            setNavOpen && setNavOpen(!navOpen);
          }}
        />
      }
    >
      <div className="w-full space-y-4">
        <div className="justify-between space-y-2 md:space-y-0 md:space-x-2 md:flex">
          <StatCard
            title="Last heard"
            value={<TimeAgo date={new Date(node.lastHeard * 1000)} />}
          />
          <StatCard title="SNR" value={node.snr.toString()} />
        </div>
        <Card
          title="Position"
          description={new Date(node.lastHeard * 1000).toLocaleString()}
        >
          <div className="p-10">
            <JSONPretty data={position} />
          </div>
        </Card>
        <Card
          title="Settings"
          description="Remote node settings"
          lgPlaceholder={
            <div className="w-full h-full text-black dark:text-white">
              <FiTerminal className="w-24 h-24 m-auto" />
              <div className="text-center">Placeholder</div>
            </div>
          }
        >
          <div className="p-10">
            <form className="space-y-4">
              <Input label={'Device Name'} />
              <Input label={'Short Name'} maxLength={3} />
              <Checkbox label="Licenced Operator?" />
            </form>
          </div>
        </Card>
      </div>
    </PrimaryTemplate>
  );
};
