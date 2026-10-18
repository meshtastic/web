import { cn } from "@core/utils/cn.ts";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex flex-wrap items-center rounded-md  p-1 mt-2 bg-slate-200 dark:bg-slate-100",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    className={cn(
      // The selected tab is a dark fill with white text so it stands out
      // from the light track; unselected tabs are muted until hovered.
      "inline-flex min-w-[100px] items-center justify-center rounded-[0.185rem] px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white cursor-pointer",
      className,
    )}
    {...props}
    ref={ref}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    className={cn(
      "mt-2 rounded-md border border-slate-200 p-6 dark:border-slate-700",
      className,
    )}
    {...props}
    ref={ref}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
