import type React from "react";

import type { Group } from "@components/CommandPalette/Index.js";
import { Combobox } from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export interface SearchResultProps {
  group: Group;
}

export const SearchResult = ({ group }: SearchResultProps): JSX.Element => {
  return (
    <div className="rounded-md border-2 border-backgroundPrimary py-2">
      <div className="flex items-center px-3 py-2">
        <group.icon className="text-gray-900 h-6 w-6 flex-none text-opacity-40" />
        <span className="ml-3 flex-auto truncate">{group.name}</span>
      </div>
      {group.commands.map((command, index) => (
        <div key={index}>
          <Combobox.Option
            value={command}
            className={({ active }) =>
              `mr-2 ml-4 flex cursor-pointer select-none items-center rounded-md px-3 py-1 ${
                active ? "text-gray-900 bg-backgroundPrimary" : ""
              }`
            }
          >
            {({ active }) => (
              <>
                <command.icon
                  className={`text-gray-900 h-4 flex-none text-opacity-40 ${
                    active ? "text-opacity-100" : ""
                  }`}
                />
                <span className="ml-3">{command.name}</span>
                {active && (
                  <ChevronRightIcon className="text-gray-400 ml-auto h-4" />
                )}
              </>
            )}
          </Combobox.Option>
          {command.subItems && (
            <div className=" ml-9 border-l">
              {command.subItems?.map((item, index) => (
                <Combobox.Option
                  key={index}
                  value={item}
                  className={({ active }) =>
                    `mx-2 flex cursor-pointer select-none items-center rounded-md px-3 py-1 ${
                      active
                        ? "text-gray-900 bg-backgroundPrimary bg-opacity-5"
                        : ""
                    }`
                  }
                >
                  {({ active }) => (
                    <>
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                      {active && (
                        <ChevronRightIcon className="text-gray-400 ml-auto h-4" />
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
