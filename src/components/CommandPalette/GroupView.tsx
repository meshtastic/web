import type { Group } from "@components/CommandPalette/Index.js";
import { Combobox } from "@headlessui/react";
import { ChevronRightIcon } from "lucide-react";

export interface GroupViewProps {
  group: Group;
}

export const GroupView = ({ group }: GroupViewProps): JSX.Element => {
  return (
    <Combobox.Option
      value={group.label}
      className={({ active }) =>
        `flex cursor-default select-none items-center rounded-md px-3 py-2 ${
          active ? "bg-backgroundPrimary text-textPrimary" : ""
        }`
      }
    >
      {({ active }) => (
        <>
          <group.icon size={20} />
          <span className="ml-3 flex-auto truncate">{group.label}</span>
          {active && (
            <ChevronRightIcon size={16} className="text-textSecondary" />
          )}
        </>
      )}
    </Combobox.Option>
  );
};
