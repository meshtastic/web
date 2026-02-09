import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@shared/components/ui/command";
import { Input } from "@shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { useSettingsNavigation, useSettingsSearch } from "../search/index.ts";

interface SearchBarProps {
  placeholder?: string;
}

export const SettingsSearchBar = ({
  placeholder = "Search settings...",
}: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { groupedResults, hasResults, resultCount } = useSettingsSearch(query);
  const { navigateToField } = useSettingsNavigation();

  const handleSelect = (
    field: (typeof groupedResults)[number]["fields"][number],
  ) => {
    navigateToField(field);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (e.target.value.trim()) {
      setOpen(true);
    }
  };

  const handleFocus = () => {
    if (query.trim()) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Popover open={open && hasResults} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            type="search"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {groupedResults.length === 0 ? (
              <CommandEmpty>No settings found.</CommandEmpty>
            ) : (
              <>
                <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                  {resultCount} result{resultCount !== 1 ? "s" : ""}
                </div>
                {groupedResults.map((group) => (
                  <CommandGroup
                    key={group.section}
                    heading={group.sectionLabel}
                  >
                    {group.fields.map((field) => (
                      <CommandItem
                        key={field.id}
                        value={field.id}
                        onSelect={() => handleSelect(field)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{field.label}</span>
                          {field.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {field.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
