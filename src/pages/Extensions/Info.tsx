import React from 'react';

import { m } from 'framer-motion';
import JSONPretty from 'react-json-pretty';

import { useAppSelector } from '@app/hooks/useAppSelector.js';
// eslint-disable-next-line import/no-unresolved
import skypack_hashicon from '@skypack/@emeraldpay/hashicon-react';

const Hashicon = skypack_hashicon.Hashicon;
// import { Hashicon } from '@emeraldpay/hashicon-react';

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
    <div className="flex flex-col flex-grow w-full gap-4 p-4 select-none">
      <m.div
        whileHover={{ scale: 1.01 }}
        className="flex flex-col w-full gap-4 p-8 rounded-md shadow-md dark:bg-primaryDark"
      >
        <div className="m-auto">
          <Hashicon value={hardwareInfo.myNodeNum.toString()} size={180} />
        </div>
        <div className="text-lg font-medium text-center dark:text-white">
          {node?.user?.longName || 'Unknown'}
        </div>
      </m.div>

      <div className="flex-grow p-8 rounded-md shadow-md dark:bg-primaryDark">
        <JSONPretty className="overflow-y-auto" data={hardwareInfo} />
      </div>
    </div>
  );
};
