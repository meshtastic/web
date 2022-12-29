import type React from "react";

import type { Group } from "@components/CommandPalette/Index.js";
import { Combobox } from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export interface GroupViewProps {
  group: Group;
}

export const GroupView = ({ group }: GroupViewProps): JSX.Element => {
  return (
    <Combobox.Option
      value={group.name}
      className={({ active }) =>
        `flex cursor-default select-none items-center rounded-md px-3 py-2 ${
          active ? "bg-backgroundPrimary text-textPrimary" : ""
        }`
      }
    >
      {({ active }) => (
        <>
          <group.icon className="h-6 w-6" />
          <span className="ml-3 flex-auto truncate">{group.name}</span>
          {active && <ChevronRightIcon className="h-5 text-textSecondary" />}
        </>
      )}
    </Combobox.Option>
  );
};
