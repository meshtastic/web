import type { Group } from "@components/CommandPalette/Index.js";
import { Combobox } from "@headlessui/react";
import { ChevronRightIcon } from "lucide-react";

export interface SearchResultProps {
  group: Group;
}

export const SearchResult = ({ group }: SearchResultProps): JSX.Element => {
  return (
    <div className="rounded-md border-2 border-backgroundPrimary py-2">
      <div className="flex items-center px-3 py-2">
        <group.icon
          size={16}
          className="flex-none text-gray-900 text-opacity-40"
        />
        <span className="ml-3 flex-auto truncate">{group.label}</span>
      </div>
      {group.commands.map((command, index) => (
        <div key={index}>
          <Combobox.Option
            value={command}
            className={({ active }) =>
              `mr-2 ml-4 flex cursor-pointer select-none items-center rounded-md px-3 py-1 ${
                active ? "bg-backgroundPrimary text-gray-900" : ""
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
                <span className="ml-3">{command.label}</span>
                {active && (
                  <ChevronRightIcon
                    size={16}
                    className="ml-auto text-gray-400"
                  />
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
                        ? "bg-backgroundPrimary bg-opacity-5 text-gray-900"
                        : ""
                    }`
                  }
                >
                  {({ active }) => (
                    <>
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                      {active && (
                        <ChevronRightIcon
                          size={16}
                          className="ml-auto text-gray-400"
                        />
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
