import { useState } from "react";
import { Metrics } from "@components/Drawer/Metrics.js";
import { Notifications } from "@components/Drawer/Notifications.js";
import { Sensor } from "@components/Drawer/Sensor.js";
import type { TabType } from "@components/generic/TabbedContent.js";
import { Tab } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export const Drawer = (): JSX.Element => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabs: TabType[] = [
    { name: "Notifications", element: Notifications },
    { name: "Metrics", element: Metrics },
    { name: "Sensor", element: Sensor }
  ];
  return (
    <Tab.Group as="div">
      <Tab.List className="flex w-full">
        {tabs.map((tab, index) => (
          <Tab key={index}>
            {({ selected }) => (
              <div
                onClick={() => {
                  setDrawerOpen(true);
                }}
                className={`flex h-full cursor-pointer border-b-4 px-1 first:pl-2 last:pr-2 hover:text-textPrimary ${
                  selected
                    ? "border-accent text-textPrimary"
                    : "border-backgroundPrimary text-textSecondary"
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
            <div className="m-auto text-textSecondary">
              {drawerOpen ? (
                <ChevronDownIcon className="h-4" />
              ) : (
                <ChevronUpIcon className="h-4" />
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
