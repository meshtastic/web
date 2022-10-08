import type React from "react";

import { CommandLineIcon } from "@heroicons/react/24/outline";

import { Mono } from "../Mono.js";

export const NoResults = (): JSX.Element => {
  return (
    <div className="py-14 px-14 text-center">
      <CommandLineIcon className="mx-auto h-6 text-slate-500" />
      <Mono className="tracking-tighter">
        Query does not match any avaliable commands
      </Mono>
    </div>
  );
};
