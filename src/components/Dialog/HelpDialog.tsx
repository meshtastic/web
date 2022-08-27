import type React from "react";

import { CogIcon, Dialog, Text } from "evergreen-ui";

import { TabbedContent, TabType } from "../layout/page/TabbedContent.js";

export interface HelpDialogProps {
  isOpen: boolean;
  close: () => void;
}

export const HelpDialog = ({ isOpen, close }: HelpDialogProps): JSX.Element => {
  const tabs: TabType[] = [
    {
      name: "Device Config",
      icon: CogIcon,
      element: () => (
        <div>
          <Text>Title</Text>
        </div>
      ),
    },
    {
      name: "Device Config",
      icon: CogIcon,
      element: () => (
        <div>
          <Text>Title 2</Text>
        </div>
      ),
    },
  ];

  return (
    <Dialog
      isShown={isOpen}
      onCloseComplete={close}
      title="Meshtastic Web Help"
      hasFooter={true}
    >
      <TabbedContent direction="vertical" tabs={tabs} />
    </Dialog>
  );
};
