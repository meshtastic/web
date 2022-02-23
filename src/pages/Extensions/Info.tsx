import type React from 'react';

import { FiRefreshCw } from 'react-icons/fi';
import JSONPretty from 'react-json-pretty';

import { Button } from '@app/components/generic/button/Button';
import { Card } from '@app/components/generic/Card';
import { Hashicon } from '@emeraldpay/hashicon-react';
import { useAppSelector } from '@hooks/useAppSelector';

export const Info = (): JSX.Element => {
  const hardwareInfo = useAppSelector(
    (state) => state.meshtastic.radio.hardware,
  );
  const node = useAppSelector((state) =>
    state.meshtastic.nodes.find(
      (node) => node.number === hardwareInfo.myNodeNum,
    ),
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 xl:flex-row">
      <Card
        title="Connected Node Details"
        actions={
          <Button className="truncate" icon={<FiRefreshCw />}>
            Refresh Node info
          </Button>
        }
        className="xl:w-3/5"
      >
        <div className="m-auto flex flex-col gap-2">
          <Hashicon value={hardwareInfo.myNodeNum.toString()} size={180} />
          <div className="text-center text-lg font-medium dark:text-white">
            {node?.user?.longName || 'Unknown'}
          </div>
        </div>
      </Card>

      <Card title="Debug Information" className="flex-grow">
        <JSONPretty className="overflow-y-auto" data={hardwareInfo} />
      </Card>
    </div>
  );
};
