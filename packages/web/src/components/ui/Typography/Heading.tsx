import { cn } from "@core/utils/cn"
import * as React from "react"

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4"
}

export function Heading({ as: Component = "h1", className, ...props }: HeadingProps) {
  const styles = {
    h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
    h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
    h4: "scroll-m-20 text-xl font-semibold tracking-tight",
  }

  return (
    <Component
      className={cn(styles[Component], className)}
      {...props}
    />
  )
}