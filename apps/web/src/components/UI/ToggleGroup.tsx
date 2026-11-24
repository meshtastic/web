import { cn } from "@core/utils/cn.ts";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import * as React from "react";
import { segmentedItemClasses, segmentedTrackClasses } from "./segmented.ts";

const toggleGroupItemClasses = [
  // 32px items + 3px track padding + border keep the group 40px tall.
  "flex flex-1 h-8 items-center justify-center",
  segmentedItemClasses,
];

const ToggleGroup = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex", segmentedTrackClasses, className)}
    {...props}
  />
));
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ComponentRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(...toggleGroupItemClasses, className)}
    {...props}
  >
    {children}
  </ToggleGroupPrimitive.Item>
));
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
