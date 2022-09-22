import type React from "react";
import type { HTMLProps } from "react";

import { FiSave } from "react-icons/fi";

import { Button } from "@components/Button.js";
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ChevronRightIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export interface FormProps extends HTMLProps<HTMLFormElement> {
  title: string;
  breadcrumbs: string[];
  reset: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  dirty: boolean;
}

export const Form = ({
  title,
  breadcrumbs,
  reset,
  loading,
  dirty,
  children,
  onSubmit,
  ...props
}: FormProps): JSX.Element => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form className="w-full" onSubmit={onSubmit} {...props}>
      {loading && (
        <div className="absolute flex w-full h-full bg-slate-600 rounded-md z-10">
          <ArrowPathIcon className="h-8 animate-spin m-auto" />
        </div>
      )}
      <div className="select-none rounded-md p-4 bg-gray-700">
        <ol className="flex gap-4">
          <li className="text-gray-400 hover:text-gray-200 cursor-pointer">
            <HomeIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
          </li>
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={index} className="flex gap-4">
              <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-gray-500" />
              <span className="text-sm font-medium text-gray-400 hover:text-gray-200 cursor-pointer">
                {breadcrumb}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex items-center">
          <h2 className="font-bold text-white truncate text-3xl tracking-tight">
            {title}
          </h2>
          <div className="flex gap-2 ml-auto">
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
      <div className="flex flex-col p-2 gap-3">{children}</div>
    </form>
  );
};
