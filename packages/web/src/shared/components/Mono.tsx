import { cn } from "@shared/utils/cn";

interface MonoProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
}
export const Mono = ({ children, className, ...rest }: MonoProps) => {
  return (
    <span
      className={cn(
        "font-mono text-sm md:text-base text-text-secondary",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
};
