import type React from "react";

import {
  Heading,
  LocateIcon,
  majorScale,
  minorScale,
  Pane,
  Small,
  Text,
} from "evergreen-ui";

import { useDevice } from "@app/core/providers/useDevice.js";
import { toMGRS } from "@core/utils/toMGRS.js";

export interface WaypointMessageProps {
  waypointID: number;
}

export const WaypointMessage = ({
  waypointID,
}: WaypointMessageProps): JSX.Element => {
  const { waypoints } = useDevice();
  const waypoint = waypoints.find((wp) => wp.id === waypointID);

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
        <Pane>
          <Pane display="flex" gap={majorScale(1)}>
            <Heading>{waypoint?.name}</Heading>
            <Text color="orange">
              {toMGRS(waypoint?.latitudeI, waypoint?.longitudeI)}
            </Text>
          </Pane>
          <Small>{waypoint?.description}</Small>
        </Pane>
      </Pane>
    </Pane>
  );
};
