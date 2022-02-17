import React from 'react';

import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/useAppSelector';
import { Hashicon } from '@emeraldpay/hashicon-react';

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
      <div className="flex w-full flex-col gap-4 rounded-md bg-white p-8 shadow-md dark:bg-primaryDark md:w-1/4">
        <div className="m-auto">
          <Hashicon value={hardwareInfo.myNodeNum.toString()} size={180} />
        </div>
        <div className="text-center text-lg font-medium dark:text-white">
          {node?.user?.longName || 'Unknown'}
        </div>
      </div>

      <div className="flex-grow rounded-md bg-white p-8 shadow-md  dark:bg-primaryDark">
        <JSONPretty className="overflow-y-auto" data={hardwareInfo} />
      </div>
    </div>
  );
};
