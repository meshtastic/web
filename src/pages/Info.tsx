import type React from "react";

import JSONPretty from "react-json-pretty";

import { useDevice } from "@core/providers/useDevice.js";

export const InfoPage = (): JSX.Element => {
  const { hardware, nodes } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  return (
    <div>
      <JSONPretty data={myNode} />
      <JSONPretty data={hardware} />
    </div>
  );
};
