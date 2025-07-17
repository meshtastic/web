import { cn } from "@core/utils/cn.ts";

interface MonoProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}
export const Mono = ({ children, className, ...rest }: MonoProps) => {
  return (
    <span
      className={cn("font-mono text-sm text-text-secondary", className)}
      {...rest}
    >
      {children}
    </span>
  );
};
