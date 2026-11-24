import { cn } from "@core/utils/cn.ts";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import * as React from "react";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = (
  props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>,
) => <TooltipPrimitive.Root {...props} />;
Tooltip.displayName = TooltipPrimitive.Tooltip.displayName;

const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipArrow = TooltipPrimitive.Arrow;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-lg border border-elevated bg-raised px-2.5 py-1.5 text-meta font-medium text-primary shadow-popover animate-in fade-in-50 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipPortal = TooltipPrimitive.Portal;

export {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
};
