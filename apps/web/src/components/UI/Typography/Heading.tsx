import type React from "react";

const headingStyles = {
  h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
  h2: "scroll-m-20 border-b border-b-slate-200 pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0 dark:border-b-slate-700",
  h3: "scroll-m-20 text-lg font-semibold tracking-tight",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight",
  h5: "scroll-m-20 text-lg font-medium tracking-tight",
};

interface HeadingProps {
  as?: "h1" | "h2" | "h3" | "h4" | "h5";
  children: React.ReactNode;
  className?: string;
}

export const Heading = ({
  as: Component = "h1",
  children,
  className = "",
  ...props
}: HeadingProps) => {
  const baseStyles = headingStyles[Component] || headingStyles.h1;

  return (
    <Component className={`${baseStyles} ${className}`} {...props}>
      {children}
    </Component>
  );
};
