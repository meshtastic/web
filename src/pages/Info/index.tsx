import type React from "react";

import { Pane } from "evergreen-ui";

import { useDevice } from "@app/core/stores/deviceStore.js";

export const InfoPage = (): JSX.Element => {
  const { hardware, nodes } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  return (
    <Pane>
      {JSON.stringify(myNode)}
      {JSON.stringify(hardware)}
    </Pane>
  );
};
