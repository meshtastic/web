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
    <div className="flex w-full select-none flex-col gap-4 p-4">
      <m.div
        whileHover={{ scale: 1.01 }}
        className="flex w-full flex-col gap-4 rounded-md p-8 shadow-md dark:bg-primaryDark"
      >
        <div className="m-auto">
          <Hashicon value={hardwareInfo.myNodeNum.toString()} size={180} />
        </div>
        <div className="text-center text-lg font-medium dark:text-white">
          {node?.user?.longName || 'Unknown'}
        </div>
      </m.div>

      <div className="rounded-md p-8 shadow-md dark:bg-primaryDark">
        <JSONPretty data={hardwareInfo} />
      </div>
    </div>
  );
};
