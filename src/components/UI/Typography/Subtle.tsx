export interface SubtleProps {
  children: React.ReactNode;
}

export const Subtle = ({ children }: SubtleProps): JSX.Element => (
  <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
);
