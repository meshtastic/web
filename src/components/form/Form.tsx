import type { FormEvent, HTMLProps } from "react";

export interface FormProps extends HTMLProps<HTMLFormElement> {
  onSubmit?: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export const Form = ({
  children,
  onSubmit,
  ...props
}: FormProps): JSX.Element => {
  return (
    <form
      className="w-full rounded-md bg-backgroundSecondary px-2"
      onSubmit={onSubmit}
      onChange={onSubmit}
      {...props}
    >
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </form>
  );
};
