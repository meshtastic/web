import type React from 'react';

import { Tab, TabProps } from './Tab';

export interface TabsProps {
  tabs: Omit<TabProps, 'activeLeft' | 'activeRight'>[];
}

export const Tabs = ({ tabs }: TabsProps): JSX.Element => {
  return (
    <div className="flex flex-grow bg-gray-300 dark:bg-secondaryDark">
      <div
        className={`h-full w-2 bg-white dark:bg-primaryDark ${
          tabs[0].active ? 'rounded-br-lg' : ''
        }`}
      />
      {tabs.map((tab, index) => (
        <Tab
          key={index}
          link={tab.link}
          title={tab.title}
          icon={tab.icon}
          active={tab.active}
          activeLeft={tabs[index - 1]?.active}
          activeRight={tabs[index + 1]?.active}
        />
      ))}
      <div
        className={`h-full flex-grow bg-white drop-shadow-md dark:bg-primaryDark ${
          tabs[tabs.length - 1].active ? 'rounded-bl-lg' : ''
        }`}
      />
    </div>
  );
};
