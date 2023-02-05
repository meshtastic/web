import { Button } from "@app/components/form/Button.js";
import { ChevronRightIcon, HomeIcon } from "@primer/octicons-react";

export interface NavBarProps {
  breadcrumb: string[];
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

export const NavBar = ({ breadcrumb, actions }: NavBarProps): JSX.Element => {
  return (
    <div className="flex rounded-md bg-backgroundSecondary p-2">
      <ol className="my-auto ml-2 flex gap-4 text-textSecondary">
        <li className="cursor-pointer hover:brightness-disabled">
          <HomeIcon className="h-5 w-5 flex-shrink-0" />
        </li>
        {breadcrumb.map((breadcrumb, index) => (
          <li key={index} className="my-auto flex gap-4">
            <ChevronRightIcon className="h-5 w-5 flex-shrink-0 brightness-disabled" />
            <span className="cursor-pointer text-sm font-medium hover:brightness-disabled">
              {breadcrumb}
            </span>
          </li>
        ))}
      </ol>
      <div className="ml-auto">
        {actions?.map((Action, index) => (
          <Button key={index} onClick={Action.onClick}>
            {Action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
