import type React from "react";
import type { HTMLProps } from "react";

import { FiSave } from "react-icons/fi";

import { Button } from "@components/Button.js";
import {
  ArrowUturnLeftIcon,
  ChevronRightIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export interface FormProps extends HTMLProps<HTMLFormElement> {
  title: string;
  breadcrumbs: string[];
  reset: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  dirty: boolean;
}

export const Form = ({
  title,
  breadcrumbs,
  reset,
  dirty,
  children,
  onSubmit,
  ...props
}: FormProps): JSX.Element => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form className="w-full" onSubmit={onSubmit} {...props}>
      <div className="select-none rounded-md bg-gray-700 p-4">
        <ol className="flex gap-4">
          <li className="cursor-pointer text-gray-400 hover:text-gray-200">
            <HomeIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
          </li>
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={index} className="flex gap-4">
              <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />
              <span className="cursor-pointer text-sm font-medium text-gray-400 hover:text-gray-200">
                {breadcrumb}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex items-center">
          <h2 className="truncate text-3xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              onClick={() => {
                reset();
              }}
              variant="secondary"
              iconBefore={<ArrowUturnLeftIcon className="w-4" />}
            >
              Reset
            </Button>
            <Button disabled={!dirty} iconBefore={<FiSave className="w-4" />}>
              Save
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-2">{children}</div>
    </form>
  );
};
