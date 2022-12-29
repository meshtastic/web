import type React from "react";
import type { HTMLProps } from "react";

import { FiSave } from "react-icons/fi";

import { Button } from "@components/form/Button.js";
import {
  ArrowUturnLeftIcon,
  ChevronRightIcon,
  HomeIcon
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
    <form className="w-full px-2" onSubmit={onSubmit} {...props}>
      <div className="select-none rounded-md bg-backgroundPrimary p-4">
        <ol className="flex gap-4 text-textSecondary">
          <li className="cursor-pointer hover:brightness-disabled">
            <HomeIcon className="h-5 w-5 flex-shrink-0" />
          </li>
          {breadcrumbs.map((breadcrumb, index) => (
            <li key={index} className="flex gap-4">
              <ChevronRightIcon className="h-5 w-5 flex-shrink-0 brightness-disabled" />
              <span className="cursor-pointer text-sm font-medium hover:brightness-disabled">
                {breadcrumb}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-2 flex items-center">
          <h2 className="text-3xl font-bold tracking-tight text-textPrimary">
            {title}
          </h2>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              onClick={() => {
                reset();
              }}
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
