import { SearchIcon } from "lucide-react";
import { Input } from "@components/UI/Input";
import { getDeepField } from "@app/core/utils/getDeepField";

export interface SearchProps<T extends object = object> {
  data: T[];
  filterBy: string;
  onFilter: (results: T[]) => void;
}

export function Search<T extends object = object>({
  data,
  filterBy,
  onFilter,
}: SearchProps<T>): JSX.Element {
  let timeout: number | string | NodeJS.Timeout;
  const onInputChange = (query: string) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      const regex = new RegExp(query, "gi");
      const results = data.filter((item) => {
        const value = getDeepField(item, filterBy);

        return value && regex.test(`${value}`);
      });

      onFilter(results);
    }, 250);
  };

  return (
    <>
      <Input
        placeholder="Search"
        action={{
          icon: SearchIcon,
          onClick: () => false,
        }}
        onChange={(e) => onInputChange(e.target.value)}
      />
    </>
  );
}
