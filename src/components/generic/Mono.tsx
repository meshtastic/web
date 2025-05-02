export const Mono = ({
  children,
  className,
  ...rest
}: JSX.IntrinsicElements["span"]) => {
  return (
    <span
      className={`font-mono text-sm text-text-secondary ${className ?? ""}`}
      {...rest}
    >
      {children}
    </span>
  );
};
