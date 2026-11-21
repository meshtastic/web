import { Dialog, DialogContent, DialogTitle } from "@components/UI/Dialog.tsx";
import { cn } from "@core/utils/cn.ts";
import type { DialogProps } from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden bg-surface text-body text-primary",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

export interface CommandDialogProps extends DialogProps {
  /** Accessible dialog title (visually hidden). Defaults to "Command menu". */
  title?: string;
  /** Props for the inner cmdk root (`shouldFilter`, `label`, `loop`, ...). */
  commandProps?: React.ComponentPropsWithoutRef<typeof CommandPrimitive>;
  /** Extra classes for the dialog panel. */
  className?: string;
  /**
   * Where focus goes on close. Radix returns it to a `DialogTrigger`; a
   * menu opened by shortcut or store has none, so callers can restore it.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

/**
 * Command menu in a dialog: a top-aligned 640px panel on wide screens, a
 * full-screen sheet on narrow ones.
 */
const CommandDialog = ({
  children,
  title,
  commandProps,
  className,
  onCloseAutoFocus,
  ...props
}: CommandDialogProps) => {
  const { t } = useTranslation("ui");
  return (
    <Dialog {...props}>
      <DialogContent
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          // Narrow: full-screen sheet.
          "max-w-none sm:max-w-none sm:rounded-none",
          "max-md:inset-0 max-md:h-dvh max-md:max-h-dvh max-md:border-0",
          // Wide: floating panel 64px from the top.
          "md:top-16 md:max-h-[calc(100dvh-8rem)] md:max-w-[640px] md:rounded-bubble",
          className,
        )}
      >
        <VisuallyHidden asChild>
          <DialogTitle>{title ?? t("shell.commandMenu")}</DialogTitle>
        </VisuallyHidden>
        <Command
          {...commandProps}
          className={cn("min-h-0 flex-1", commandProps?.className)}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export type CommandInputProps = React.ComponentPropsWithoutRef<
  typeof CommandPrimitive.Input
> & {
  /** Content after the field, e.g. an esc hint or a close button. */
  trailing?: React.ReactNode;
  /** Replaces the search icon (e.g. a back button inside a picker). */
  leading?: React.ReactNode;
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  CommandInputProps
>(({ className, trailing, leading, ...props }, ref) => (
  <div
    className="flex h-14 shrink-0 items-center gap-2.5 border-b border-subtle px-4 text-muted"
    cmdk-input-wrapper=""
  >
    {leading ?? <Search aria-hidden="true" className="size-[18px] shrink-0" />}
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "h-full min-w-0 flex-1 bg-transparent text-header-lg text-primary outline-hidden placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
    {trailing}
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[400px] overflow-x-hidden overflow-y-auto overscroll-contain p-2",
      className,
    )}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("py-10 text-center text-body text-muted", className)}
    {...props}
  />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden text-primary [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-meta [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-2 my-1 border-t border-subtle", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex h-11 cursor-pointer select-none items-center gap-3 rounded-control px-2.5 text-body text-primary outline-hidden data-[selected=true]:bg-selected data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto shrink-0 text-meta text-muted", className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
