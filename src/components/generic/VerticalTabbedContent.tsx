import { Fragment } from "react";
import { Mono } from "@components/generic/Mono";
import { Tab } from "@headlessui/react";

export interface TabType {
  label: string;
  element: () => JSX.Element;
  disabled?: boolean;
}

export interface TabbedContentProps {
  tabs: TabType[];
}

export const VerticalTabbedContent = ({
  tabs
}: TabbedContentProps): JSX.Element => {
  return (
    <Tab.Group as="div" className="flex w-full gap-3">
      <Tab.List className="flex w-44 flex-col">
        {tabs.map((tab, index) => (
          <Tab key={index} as={Fragment}>
            {({ selected }) => (
              <div
                className={`flex cursor-pointer items-center border-l-4 p-4 text-sm font-medium ${
                  selected
                    ? "border-accent bg-accentMuted bg-opacity-10 text-textPrimary"
                    : "border-backgroundPrimary text-textSecondary"
                }`}
              >
                {tab.label}
                <span className="ml-auto rounded-full bg-accent px-3 text-textPrimary">
                  3
                </span>
              </div>
            )}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels as={Fragment}>
        {tabs.map((tab, index) => (
          <Tab.Panel key={index} as={Fragment}>
            <tab.element />
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
