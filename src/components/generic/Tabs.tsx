import React from 'react';

import { Tab } from '@headlessui/react';

type DefaultDivProps = JSX.IntrinsicElements['div'];

interface TabProps extends DefaultDivProps {
  tabs: {
    name: string;
    body: JSX.Element;
  }[];
}

export const Tabs = ({ tabs, className, ...props }: TabProps): JSX.Element => {
  return (
    <Tab.Group as="div" className={className}>
      <Tab.List className="flex border-l border-r border-t shadow-md rounded-t-3xl dark:border-gray-600">
        {tabs.map((tab) => (
          <Tab
            key={tab.name}
            className={({ selected }): string =>
              `w-full text-lg font-medium p-2 border-b-2 ${
                selected
                  ? 'dark:border-gray-200 border-gray-600'
                  : 'border-transparent dark:border-transparent'
              }`
            }
          >
            {tab.name}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="h-full">
        {tabs.map((tab, index) => (
          <Tab.Panel
            key={index}
            className={
              'border dark:border-gray-600 rounded-b-3xl p-4 h-full shadow-md'
            }
          >
            {tab.body}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
