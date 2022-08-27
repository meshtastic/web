import type React from "react";

import {
  CrossIcon,
  Heading,
  IconButton,
  majorScale,
  Overlay,
  Pane,
} from "evergreen-ui";

export interface DialogProps {
  isOpen: boolean;
  close: () => void;
  title?: string;
  background?: boolean;
  width?: number;
  children: React.ReactNode;
}

export const Dialog = ({
  isOpen,
  close,
  title,
  background,
  width,
  children,
}: DialogProps): JSX.Element => {
  return (
    <Overlay
      isShown={isOpen}
      onExit={close}
      containerProps={{
        display: "flex",
      }}
    >
      <Pane
        role="dialog"
        width={width ?? majorScale(80)}
        margin="auto"
        display="flex"
        flexDirection="column"
        zIndex={1}
        borderRadius={majorScale(1)}
        padding={majorScale(3)}
        background={background ? "white" : undefined}
      >
        {background && (
          <Pane
            display="flex"
            justifyContent="space-between"
            marginBottom={majorScale(2)}
          >
            <Heading size={600}>{title}</Heading>
            <IconButton icon={CrossIcon} onClick={close} />
          </Pane>
        )}

        {children}
      </Pane>
    </Overlay>
  );
};
