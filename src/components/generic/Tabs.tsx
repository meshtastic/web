import React from 'react';

import { Tab } from '@headlessui/react';

type DefaultDivProps = JSX.IntrinsicElements['div'];

interface TabProps extends DefaultDivProps {
  tabs: {
    name: string;
    body: JSX.Element;
  }[];
}

export const Tabs = ({ tabs }: TabProps) => {
  //   let [categories] = useState({
  //     Recent: [
  //       {
  //         id: 1,
  //         title: 'Does drinking coffee make you smarter?',
  //         date: '5h ago',
  //         commentCount: 5,
  //         shareCount: 2,
  //       },
  //       {
  //         id: 2,
  //         title: "So you've bought coffee... now what?",
  //         date: '2h ago',
  //         commentCount: 3,
  //         shareCount: 2,
  //       },
  //     ],
  //     Popular: [
  //       {
  //         id: 1,
  //         title: 'Is tech making coffee better or worse?',
  //         date: 'Jan 7',
  //         commentCount: 29,
  //         shareCount: 16,
  //       },
  //       {
  //         id: 2,
  //         title: 'The most innovative things happening in coffee',
  //         date: 'Mar 19',
  //         commentCount: 24,
  //         shareCount: 12,
  //       },
  //     ],
  //     Trending: [
  //       {
  //         id: 1,
  //         title: 'Ask Me Anything: 10 answers to your questions about coffee',
  //         date: '2d ago',
  //         commentCount: 9,
  //         shareCount: 5,
  //       },
  //       {
  //         id: 2,
  //         title: "The worst advice we've ever heard about coffee",
  //         date: '4d ago',
  //         commentCount: 1,
  //         shareCount: 2,
  //       },
  //     ],
  //   })

  return (
    <Tab.Group as="div">
      <Tab.List className="flex p-2 space-x-2 border shadow-md rounded-t-3xl dark:border-gray-600">
        {tabs.map((tab) => (
          <Tab
            key={tab.name}
            className={({ selected }) => `w-full text-lg font-medium`}
          >
            {tab.name}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels>
        {tabs.map((tab, index) => (
          <Tab.Panel
            key={index}
            className={
              'border dark:border-gray-600 rounded-b-3xl p-2 h-80 shadow-md'
            }
          >
            {tab.body}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
