import type React from "react";

import type { Group } from "@components/CommandPalette/Index.js";
import { Combobox } from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export interface SearchResultProps {
  group: Group;
}

export const SearchResult = ({ group }: SearchResultProps): JSX.Element => {
  return (
    <div className="rounded-md border border-gray-300 py-2 shadow-md">
      <div className="flex items-center px-3 py-2">
        <group.icon className="h-6 w-6 flex-none text-gray-900 text-opacity-40" />
        <span className="ml-3 flex-auto truncate">{group.name}</span>
      </div>
      {group.commands.map((command, index) => (
        <div key={index}>
          <Combobox.Option
            value={command}
            className={({ active }) =>
              `mr-2 ml-4 flex cursor-pointer select-none items-center rounded-md px-3 py-1 ${
                active ? "bg-gray-900 bg-opacity-5 text-gray-900" : ""
              }`
            }
          >
            {({ active }) => (
              <>
                <command.icon
                  className={`h-4 flex-none text-gray-900 text-opacity-40 ${
                    active ? "text-opacity-100" : ""
                  }`}
                />
                <span className="ml-3">{command.name}</span>
                {active && (
                  <ChevronRightIcon className="ml-auto h-4 text-gray-400" />
                )}
              </>
            )}
          </Combobox.Option>
          {command.subItems && (
            <div className=" ml-9 border-l">
              {command.subItems?.map((item) => (
                <Combobox.Option
                  key={index}
                  value={item}
                  className={({ active }) =>
                    `mx-2 flex cursor-pointer select-none items-center rounded-md px-3 py-1 ${
                      active ? "bg-gray-900 bg-opacity-5 text-gray-900" : ""
                    }`
                  }
                >
                  {({ active }) => (
                    <>
                      <span className="ml-3">{item.name}</span>
                      {active && (
                        <ChevronRightIcon className="ml-auto h-4 text-gray-400" />
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
