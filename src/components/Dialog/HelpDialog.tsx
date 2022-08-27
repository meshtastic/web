import type React from "react";

import { CogIcon, CrossIcon, IconButton, Text } from "evergreen-ui";

import { TabbedContent, TabType } from "../layout/page/TabbedContent.js";
import { Dialog } from "./index.js";

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
    <Dialog isOpen={isOpen} close={close} title="Help">
      <TabbedContent
        tabs={tabs}
        actions={[() => <IconButton icon={CrossIcon} onClick={close} />]}
      />
    </Dialog>
  );
};
