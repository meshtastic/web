export interface BlockquoteProps {
  children: React.ReactNode;
}

export const BlockQuote = ({ children }: BlockquoteProps): JSX.Element => (
  <blockquote className="mt-6 border-l-2 border-slate-300 pl-6 italic text-slate-800 dark:border-slate-600 dark:text-slate-200">
    {children}
  </blockquote>
);
