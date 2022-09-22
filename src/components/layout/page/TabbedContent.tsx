import type React from "react";
import { Fragment } from "react";

import { Tab } from "@headlessui/react";

export interface TabType {
  name: string;
  icon?: JSX.Element;
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
  return (
    <Tab.Group as="div" className="flex flex-col gap-2 p-4 flex-grow">
      <Tab.List className="flex gap-4 border-b pb-3">
        {tabs.map((entry, index) => (
          <Tab key={index}>
            {({ selected }) => (
              <div
                className={`flex gap-3 h-10 font-medium text-sm rounded-md cursor-pointer px-3 ${
                  selected
                    ? "bg-gray-100 text-gray-700"
                    : "text-gray-500 hover:text-gray-700"
                }
                   `}
              >
                {entry.icon && (
                  <div className="m-auto text-slate-500">{entry.icon}</div>
                )}
                <span className="m-auto">{entry.name}</span>
              </div>
            )}
          </Tab>
        ))}
        <div className="ml-auto">
          {actions?.map((Action, index) => (
            <Action key={index} />
          ))}
        </div>
      </Tab.List>
      <Tab.Panels as={Fragment}>
        {tabs.map((entry, index) => (
          <Tab.Panel key={index} className="flex flex-grow">
            <entry.element />
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
