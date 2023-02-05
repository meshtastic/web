import { Mono } from "@components/generic/Mono.js";
import { CommandLineIcon } from "@heroicons/react/24/outline";

export const NoResults = (): JSX.Element => {
  return (
    <div className="py-14 px-14 text-center">
      <CommandLineIcon className="mx-auto h-6 text-textSecondary" />
      <Mono className="tracking-tighter">
        Query does not match any avaliable commands
      </Mono>
    </div>
  );
};
