export interface CodeProps {
  children: React.ReactNode;
}

export const Code = ({ children }: CodeProps) => (
  <code className="relative rounded-sm bg-raised px-[0.3rem] py-[0.2rem] text-sm font-semibold font-mono text-primary">
    {children}
  </code>
);
