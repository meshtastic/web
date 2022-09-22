import type React from "react";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export interface DropdownProps {
  title: string;
  icon: JSX.Element;
  children: React.ReactNode;
}

export const Dropdown = ({
  title,
  icon,
  children,
}: DropdownProps): JSX.Element => {
  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex h-8 justify-between bg-slate-100 px-2 hover:bg-slate-200">
            <div className="my-auto flex gap-2 text-slate-700">
              <div className="my-auto">{icon}</div>
              <span className="text-lg font-medium">{title}</span>
            </div>
            <div className="my-auto text-slate-600">
              {open ? (
                <ChevronUpIcon className="h-5" />
              ) : (
                <ChevronDownIcon className="h-5" />
              )}
            </div>
          </Disclosure.Button>
          <Disclosure.Panel>{children}</Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};
