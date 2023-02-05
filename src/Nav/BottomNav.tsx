import { GitBranchIcon } from "@primer/octicons-react";
import type { ReactNode } from "react";

export interface BottomNavProps {
  children: ReactNode;
}

export const BottomNav = ({ children }: BottomNavProps): JSX.Element => {
  return (
    <div className="flex bg-backgroundPrimary">
      <div className="flex h-8 cursor-pointer select-none gap-1 bg-accent px-1 text-textPrimary hover:brightness-hover active:brightness-press">
        <GitBranchIcon className="my-auto w-4" />
        <span className="my-auto font-mono text-sm">
          {process.env.COMMIT_HASH}
        </span>
      </div>
      {children}
    </div>
  );
};
