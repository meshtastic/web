import React from 'react';

import JSONPretty from 'react-json-pretty';

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
    <div className="flex h-full flex-col gap-4 p-4 md:flex-row">
      <Card className="md:w-1/4">
        <div className="m-auto flex flex-col gap-2">
          <Hashicon value={hardwareInfo.myNodeNum.toString()} size={180} />
          <div className="text-center text-lg font-medium dark:text-white">
            {node?.user?.longName || 'Unknown'}
          </div>
        </div>
      </Card>

      <Card className="flex-grow">
        <JSONPretty className="overflow-y-auto" data={hardwareInfo} />
      </Card>
    </div>
  );
};
