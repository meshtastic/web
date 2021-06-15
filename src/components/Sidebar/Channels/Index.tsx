import React from 'react';

import { Disclosure } from '@headlessui/react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HashtagIcon,
} from '@heroicons/react/outline';

import { TranslationsContext } from '../../../translations/TranslationsContext';
import ChannelList from './ChannelList';

const Channels = (): JSX.Element => {
  const { translations } = React.useContext(TranslationsContext);
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer">
            <div className="flex">
              {open ? (
                <ChevronDownIcon className="my-auto w-5 h-5 mr-2" />
              ) : (
                <ChevronRightIcon className="my-auto w-5 h-5 mr-2" />
              )}
              <HashtagIcon className="my-auto text-gray-600 mr-2 2-5 h-5" />
              {translations.device_channels_title}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>
            <React.Suspense
              fallback={
                <div className="flex border-b border-gray-300">
                  <div className="m-auto p-3 text-gray-500">Loading...</div>
                </div>
              }
            >
              <ChannelList />
            </React.Suspense>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};

export default Channels;
