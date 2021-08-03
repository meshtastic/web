import React from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/outline';

interface DropdownProps {
  icon: JSX.Element;
  title: string;
  content: JSX.Element;
  fallbackMessage: string;
}

export const Dropdown = (props: DropdownProps): JSX.Element => {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full text-lg font-medium justify-between p-3 border-b hover:bg-gray-200 cursor-pointer first:rounded-t-3xl last:rounded-b-3xl">
            <div className="flex">
              <motion.div
                className="my-auto mr-2"
                variants={{
                  initial: { rotate: -90 },
                  animate: {
                    rotate: 0,
                  },
                }}
                initial="initial"
                animate={open ? 'animate' : 'initial'}
              >
                <ChevronDownIcon className="w-5 h-5" />
              </motion.div>
              {props.icon}
              {props.title}
            </div>
          </Disclosure.Button>

          <AnimatePresence>
            {open && (
              <Disclosure.Panel
                as={motion.div}
                initial={{
                  height: 0,
                }}
                animate={{
                  height: 'auto',
                }}
                exit={{
                  height: 0,
                }}
                className="shadow-inner"
              >
                <React.Suspense
                  fallback={
                    <div className="flex border-b border-gray-300">
                      <div className="m-auto p-3 text-gray-500">
                        {props.fallbackMessage}
                      </div>
                    </div>
                  }
                >
                  {props.content}
                </React.Suspense>
              </Disclosure.Panel>
            )}
          </AnimatePresence>
        </>
      )}
    </Disclosure>
  );
};
