import type React from "react";
import { useState } from "react";

import { IconComponent, majorScale, Pane, Tab, Tablist } from "evergreen-ui";
import type { IconType } from "react-icons";

export interface TabType {
  name: string;
  icon: IconComponent | IconType;
  element: () => JSX.Element;
  disabled?: boolean;
}

export interface TabbedContentProps {
  tabs: TabType[];
  actions?: (() => JSX.Element)[];
}

export const TabbedContent = ({
  tabs,
  actions,
}: TabbedContentProps): JSX.Element => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Pane
      margin={majorScale(3)}
      borderRadius={majorScale(1)}
      background="white"
      elevation={1}
      display="flex"
      flexGrow={1}
      flexDirection="column"
      padding={majorScale(2)}
      gap={majorScale(2)}
    >
      <Pane borderBottom="muted" paddingBottom={majorScale(2)}>
        <Pane display="flex">
          <Tablist>
            {tabs.map((Entry, index) => (
              <Tab
                key={index}
                userSelect="none"
                disabled={Entry.disabled}
                gap={5}
                onSelect={() => setSelectedTab(index)}
                isSelected={selectedTab === index}
              >
                <Entry.icon />
                {Entry.name}
              </Tab>
            ))}
          </Tablist>

          <Pane marginLeft="auto">
            {actions?.map((Action, index) => (
              <Action key={index} />
            ))}
          </Pane>
        </Pane>
      </Pane>
      {tabs.map((Entry, index) => (
        <Pane
          key={index}
          display={selectedTab === index ? "flex" : "none"}
          flexDirection="column"
          flexGrow={1}
        >
          {!Entry.disabled && <Entry.element />}
        </Pane>
      ))}
    </Pane>
  );
};
