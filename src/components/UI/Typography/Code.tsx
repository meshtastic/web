export interface CodeProps {
  children: React.ReactNode;
}

export const Code = ({ children }: CodeProps): JSX.Element => (
  <code className="relative rounded bg-slate-100 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-400">
    {children}
  </code>
);
