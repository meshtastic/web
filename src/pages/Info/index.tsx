import type React from "react";

import { Pane } from "evergreen-ui";
import JSONPretty from "react-json-pretty";

import { useDevice } from "@core/providers/useDevice.js";

export const InfoPage = (): JSX.Element => {
  const { hardware, nodes } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  return (
    <Pane>
      <JSONPretty data={myNode} />
      <JSONPretty data={hardware} />
    </Pane>
  );
};
