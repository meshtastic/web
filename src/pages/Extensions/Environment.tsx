import type React from "react";

import { Pane } from "evergreen-ui";

import { useDevice } from "@core/providers/useDevice.js";

export const Environment = (): JSX.Element => {
  const { nodes } = useDevice();

  return (
    <Pane>
      {nodes.map((node, index) => (
        <Pane key={index}>{JSON.stringify(node.environmentMetrics)}</Pane>
      ))}
    </Pane>
  );
};
