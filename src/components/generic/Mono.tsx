export const Mono = ({
  children,
  className,
  ...rest
}: JSX.IntrinsicElements["span"]): JSX.Element => {
  return (
    <span
      className={`font-mono text-sm text-textSecondary ${className ?? ""}`}
      {...rest}
    >
      {children}
    </span>
  );
};
