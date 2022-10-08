import type React from "react";

import { Combobox } from "@headlessui/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export interface SearchBoxProps {
  setQuery: (query: string) => void;
}

export const SearchBox = ({ setQuery }: SearchBoxProps): JSX.Element => {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-900 text-opacity-40" />
      <Combobox.Input
        className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:ring-0"
        placeholder="Search..."
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );
};
