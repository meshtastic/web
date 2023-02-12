export interface LinkProps {
  href: string;
  children: React.ReactNode;
}

export const Link = ({ href, children }: LinkProps): JSX.Element => (
  <a
    href={href}
    target={"_blank"}
    rel="noopener noreferrer"
    className="font-medium text-slate-900 underline underline-offset-4 dark:text-slate-50"
  >
    {children}
  </a>
);
