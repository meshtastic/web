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
      "inline-flex flex-wrap items-stretch overflow-hidden rounded-md p-0 mt-2 bg-neutral-200 dark:bg-neutral-100",
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
      // The selected tab is a solid grey with white text so it stands out
      // from the light track (and from the darker Settings tracks in dark
      // mode); unselected tabs are muted until hovered.
      "inline-flex min-w-[100px] items-center justify-center rounded-none px-3 py-2 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-300/60 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-neutral-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:bg-neutral-600 dark:data-[state=active]:bg-neutral-500 dark:data-[state=active]:text-white dark:data-[state=active]:hover:bg-neutral-500 cursor-pointer",
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
