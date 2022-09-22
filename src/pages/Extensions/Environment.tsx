import type React from "react";

import { useDevice } from "@core/providers/useDevice.js";

export const Environment = (): JSX.Element => {
  const { nodes } = useDevice();

  return (
    <div>
      {nodes.map((node, index) => (
        <div key={index}>{JSON.stringify(node.environmentMetrics)}</div>
      ))}
    </div>
  );
};
