import type React from "react";
import { useState } from "react";

import { Metrics } from "@components/Drawer/Metrics.js";
import { Notifications } from "@components/Drawer/Notifications.js";
import type { TabType } from "@components/generic/TabbedContent.js";
import { Tab } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export const Drawer = (): JSX.Element => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: TabType[] = [
    { name: "Notifications", element: Notifications },
    { name: "Metrics", element: Metrics }
  ];
  return (
    <Tab.Group>
      <Tab.List className="flex">
        {tabs.map((tab, index) => (
          <Tab key={index}>
            {({ selected }) => (
              <div
                onClick={() => {
                  setDrawerOpen(true);
                }}
                className={`flex h-full cursor-pointer px-1 first:pl-2 last:pr-2 hover:bg-orange-200 hover:text-orange-700 ${
                  selected ? "bg-orange-500 text-white" : "bg-white text-black"
                }`}
              >
                <span className="m-auto select-none">{tab.name}</span>
              </div>
            )}
          </Tab>
        ))}

        <div className="ml-auto flex h-8">
          <div
            onClick={() => {
              setDrawerOpen(!drawerOpen);
            }}
            className="flex cursor-pointer px-2"
          >
            <div className="m-auto">
              {drawerOpen ? (
                <ChevronDownIcon className="h-4 text-gray-700" />
              ) : (
                <ChevronUpIcon className="h-4 text-gray-700" />
              )}
            </div>
          </div>
        </div>
      </Tab.List>

      <Tab.Panels className={`${drawerOpen ? "flex" : "hidden"}`}>
        {tabs.map((tab, index) => (
          <Tab.Panel key={index} className="flex h-40 flex-grow">
            {tab.element}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
