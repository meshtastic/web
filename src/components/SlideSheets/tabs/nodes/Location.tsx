import type React from "react";

import { Pane } from "evergreen-ui";
import JSONPretty from "react-json-pretty";

import type { Node } from "@core/stores/deviceStore.js";

export interface LocationProps {
  node?: Node;
}

export const Location = ({ node }: LocationProps): JSX.Element => {
  return (
    <Pane>
      <JSONPretty data={node?.data.position} />
    </Pane>
  );
};
