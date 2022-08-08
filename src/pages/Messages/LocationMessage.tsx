import type React from "react";

import { LocateIcon, majorScale, minorScale, Pane, Text } from "evergreen-ui";

import { toMGRS } from "@app/core/utils/toMGRS.js";
import type { Protobuf } from "@meshtastic/meshtasticjs";

export interface LocationMessageProps {
  location: Protobuf.Location;
}

export const LocationMessage = ({
  location,
}: LocationMessageProps): JSX.Element => {
  return (
    <Pane
      marginLeft={majorScale(2)}
      paddingLeft={majorScale(1)}
      borderLeft="3px solid #e6e6e6"
    >
      <Pane
        gap={majorScale(1)}
        display="flex"
        borderRadius={majorScale(1)}
        elevation={1}
        padding={minorScale(1)}
      >
        <LocateIcon color="#474d66" marginY="auto" />
        <Text>{toMGRS(location.latitudeI, location.longitudeI)}</Text>
      </Pane>
    </Pane>
  );
};
