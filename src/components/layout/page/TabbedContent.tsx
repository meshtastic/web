import type React from "react";

import { IconComponent, majorScale, Pane, Tab, Tablist } from "evergreen-ui";

export interface Tab {
  key: number;
  name: string;
  icon: IconComponent;
  element: () => JSX.Element;
  disabled?: boolean;
}

export interface TabbedContentProps {
  active: number;
  setActive: (index: number) => void;
  tabs: Tab[];
  actions?: (() => JSX.Element)[];
}

export const TabbedContent = ({
  active,
  setActive,
  tabs,
  actions,
}: TabbedContentProps): JSX.Element => {
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
            {tabs.map((Entry) => (
              <Tab
                key={Entry.key}
                disabled={Entry.disabled}
                gap={5}
                onSelect={() => setActive(Entry.key)}
                isSelected={active === Entry.key}
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
      {tabs.map((Entry) => (
        <Pane
          key={Entry.key}
          display={active === Entry.key ? "flex" : "none"}
          flexDirection="column"
          flexGrow={1}
        >
          <Entry.element />
        </Pane>
      ))}
    </Pane>
  );
};
