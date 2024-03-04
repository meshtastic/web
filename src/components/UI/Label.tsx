import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "@core/utils/cn.js";

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none node-disabled:cursor-not-allowed node-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
