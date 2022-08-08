import type React from "react";
import { useState } from "react";

import {
  Heading,
  IconComponent,
  majorScale,
  Pane,
  Paragraph,
  Tab,
  Tablist,
} from "evergreen-ui";
import type { IconType } from "react-icons";

export interface TabType {
  name: string;
  icon: IconComponent | IconType;
  element: () => JSX.Element;
  disabled?: boolean;
}

export interface SlideSheetTabbedContentProps {
  heading: string;
  description: string;
  tabs: TabType[];
}

export const SlideSheetTabbedContent = ({
  heading,
  description,
  tabs,
}: SlideSheetTabbedContentProps): JSX.Element => {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <>
      <Pane zIndex={1} flexShrink={0} elevation={1} backgroundColor="white">
        <Pane padding={16} borderBottom="muted">
          <Heading size={600}>{heading}</Heading>
          <Paragraph size={400} color="muted">
            {description}
          </Paragraph>
        </Pane>
        <Pane display="flex" padding={8}>
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
        </Pane>
      </Pane>
      <Pane display="flex" overflowY="scroll" background="tint1" padding={16}>
        {tabs.map((Entry, index) => (
          <Pane
            key={index}
            borderRadius={majorScale(1)}
            backgroundColor="white"
            elevation={1}
            flexGrow={1}
            display={selectedTab === index ? "block" : "none"}
          >
            {!Entry.disabled && <Entry.element />}
          </Pane>
        ))}
      </Pane>
    </>
  );
};
