import { Mono } from "@components/generic/Mono.js";
import { TerminalSquareIcon } from "lucide-react";

export const NoResults = (): JSX.Element => {
  return (
    <div className="py-14 px-14 text-center">
      <TerminalSquareIcon className="mx-auto text-textSecondary" />
      <Mono className="tracking-tighter">
        Query does not match any avaliable commands
      </Mono>
    </div>
  );
};
