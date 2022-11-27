import type React from "react";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

import { Mono } from "./Mono.js";

export interface DropdownProps {
  title: string;
  stat?: number;
  icon: JSX.Element;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Dropdown = ({
  title,
  stat,
  icon,
  defaultOpen,
  children
}: DropdownProps): JSX.Element => {
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <>
          <Disclosure.Button className="group flex h-8 justify-between bg-slate-100 px-2 hover:bg-slate-200">
            <div className="my-auto flex gap-2 text-slate-700">
              <div className="my-auto">{icon}</div>
              <span className="text-lg font-medium">{title}</span>
              {stat !== undefined && (
                <span className="my-auto flex rounded-full bg-slate-200 px-3 py-0.5 group-hover:bg-slate-300">
                  <Mono>{stat}</Mono>
                </span>
              )}
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
