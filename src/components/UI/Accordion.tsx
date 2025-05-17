import { cn } from "@core/utils/cn.ts";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { type ComponentRef, forwardRef } from "react";

export const Accordion = AccordionPrimitive.Root;

export const AccordionHeader = AccordionPrimitive.Header;

export const AccordionItem = AccordionPrimitive.Item;

export const AccordionTrigger = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex justify-between items-center w-full p-4 border-b border-slate-200 dark:border-slate-800 group",
      className,
    )}
    {...props}
  >
    {props.children}
    <ChevronDownIcon
      className="h-5 w-5 transition-transform duration-300 group-data-[state=open]:rotate-180"
      aria-hidden
    />
  </AccordionPrimitive.Trigger>
));

export const AccordionContent = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "p-4 border-b border-slate-200 dark:border-slate-800",
      className,
    )}
    {...props}
  />
));
