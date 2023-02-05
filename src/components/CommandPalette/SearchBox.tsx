import { Combobox } from "@headlessui/react";
import { SearchIcon } from "lucide-react";

export interface SearchBoxProps {
  setQuery: (query: string) => void;
}

export const SearchBox = ({ setQuery }: SearchBoxProps): JSX.Element => {
  return (
    <div className="relative">
      <SearchIcon
        size={20}
        className="pointer-events-none absolute m-3.5 text-textSecondary"
      />
      <Combobox.Input
        className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm text-textPrimary placeholder-textSecondary focus:ring-0"
        placeholder="Search..."
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  );
};
