import type React from "react";

import { DisableIcon, EmptyState, Pane } from "evergreen-ui";

export const NoDevice = (): JSX.Element => {
  return (
    <Pane elevation={1} margin="auto">
      <EmptyState
        title="No Device Connected"
        orientation="horizontal"
        background="light"
        icon={<DisableIcon color="#EBAC91" />}
        iconBgColor="#F8E3DA"
        description="You must connect a Meshtastic device to continue."
      />
    </Pane>
  );
};
