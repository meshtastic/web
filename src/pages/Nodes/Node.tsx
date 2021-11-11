import 'react-json-pretty/themes/acai.css';

import React from 'react';

import moment from 'moment';
import { FiMenu, FiTerminal } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';
import TimeAgo from 'react-timeago';

import { Card } from '@app/components/generic/Card';
import { Chart } from '@app/components/generic/Chart';
import { Checkbox } from '@app/components/generic/form/Checkbox';
import { Input } from '@app/components/generic/form/Input';
import { IconButton } from '@app/components/generic/IconButton.jsx';
import { StatCard } from '@app/components/generic/StatCard';
import { PrimaryTemplate } from '@components/templates/PrimaryTemplate';
import type { Protobuf } from '@meshtastic/meshtasticjs';

export interface NodeProps {
  navOpen?: boolean;
  setNavOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  node: Protobuf.NodeInfo;
}

export const Node = ({ navOpen, setNavOpen, node }: NodeProps): JSX.Element => {
  return (
    <PrimaryTemplate
      title={node.user?.longName ?? node.num.toString()}
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
        <Chart
          title={`${node.user?.longName ?? 'UNK'}`}
          description="Airtime"
          hasMultipleSeries={true}
          series={[
            {
              name: 'Series 1',
              data: [
                {
                  x: moment().subtract(12, 'months').day(1).toDate(),
                  y: 4884,
                },
                {
                  x: moment().subtract(12, 'months').day(4).toDate(),
                  y: 5351,
                },
                {
                  x: moment().subtract(12, 'months').day(7).toDate(),
                  y: 5293,
                },
                {
                  x: moment().subtract(12, 'months').day(10).toDate(),
                  y: 4908,
                },
                {
                  x: moment().subtract(12, 'months').day(13).toDate(),
                  y: 5027,
                },
                {
                  x: moment().subtract(12, 'months').day(16).toDate(),
                  y: 4837,
                },
                {
                  x: moment().subtract(12, 'months').day(19).toDate(),
                  y: 4484,
                },
                {
                  x: moment().subtract(12, 'months').day(22).toDate(),
                  y: 4071,
                },
                {
                  x: moment().subtract(12, 'months').day(25).toDate(),
                  y: 4124,
                },
                {
                  x: moment().subtract(12, 'months').day(28).toDate(),
                  y: 4563,
                },
                {
                  x: moment().subtract(11, 'months').day(1).toDate(),
                  y: 3820,
                },
                {
                  x: moment().subtract(11, 'months').day(4).toDate(),
                  y: 3968,
                },
              ],
            },
            {
              name: 'Series 2',
              data: [
                {
                  x: moment().subtract(12, 'months').day(1).toDate(),
                  y: 4332,
                },
                {
                  x: moment().subtract(12, 'months').day(4).toDate(),
                  y: 6642,
                },
                {
                  x: moment().subtract(12, 'months').day(7).toDate(),
                  y: 5531,
                },
                {
                  x: moment().subtract(12, 'months').day(10).toDate(),
                  y: 2231,
                },
                {
                  x: moment().subtract(12, 'months').day(13).toDate(),
                  y: 5532,
                },
                {
                  x: moment().subtract(12, 'months').day(16).toDate(),
                  y: 3352,
                },
                {
                  x: moment().subtract(12, 'months').day(19).toDate(),
                  y: 6633,
                },
                {
                  x: moment().subtract(12, 'months').day(22).toDate(),
                  y: 1442,
                },
                {
                  x: moment().subtract(12, 'months').day(25).toDate(),
                  y: 4332,
                },
                {
                  x: moment().subtract(12, 'months').day(28).toDate(),
                  y: 6332,
                },
                {
                  x: moment().subtract(11, 'months').day(1).toDate(),
                  y: 5334,
                },
                {
                  x: moment().subtract(11, 'months').day(4).toDate(),
                  y: 5253,
                },
              ],
            },
          ]}
        />
        <Card
          title="Position"
          description={new Date(node.lastHeard * 1000).toLocaleString()}
        >
          <div className="p-10">
            <JSONPretty data={node.position} />
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
