import type React from "react";
import type { HTMLProps } from "react";

export interface FormProps extends HTMLProps<HTMLFormElement> {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export const Form = ({
  children,
  onSubmit,
  ...props
}: FormProps): JSX.Element => {
  return (
    <form
      className="mr-2 w-full rounded-md bg-backgroundSecondary px-2"
      onSubmit={onSubmit}
      {...props}
    >
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </form>
  );
};
