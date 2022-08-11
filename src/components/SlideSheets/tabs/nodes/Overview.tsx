import type React from "react";

import { Pane } from "evergreen-ui";
import JSONPretty from "react-json-pretty";

import type { Node } from "@app/core/stores/deviceStore.js";

export interface OverviewProps {
  node?: Node;
}
export const Overview = ({ node }: OverviewProps): JSX.Element => {
  return (
    <Pane>
      <JSONPretty data={node?.data.user} />
    </Pane>
  );
};
