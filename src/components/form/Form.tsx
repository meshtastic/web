import type React from "react";
import type { HTMLProps } from "react";

import { Button, majorScale, Pane, SavedIcon, Spinner } from "evergreen-ui";

export interface FormProps extends HTMLProps<HTMLFormElement> {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  dirty: boolean;
}

export const Form = ({
  loading,
  dirty,
  children,
  onSubmit,
  ...props
}: FormProps): JSX.Element => {
  return (
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    <form onSubmit={onSubmit} style={{ position: "relative" }} {...props}>
      {loading && (
        <Pane
          position="absolute"
          display="flex"
          width="100%"
          height="100%"
          backgroundColor="rgba(67, 90, 111, 0.2)"
          zIndex={10}
          borderRadius={majorScale(1)}
        >
          <Spinner margin="auto" />
        </Pane>
      )}
      {children}
      <Pane display="flex" marginTop={majorScale(2)}>
        <Button
          type="submit"
          marginLeft="auto"
          disabled={!dirty}
          iconBefore={<SavedIcon />}
        >
          Save
        </Button>
      </Pane>
    </form>
  );
};
