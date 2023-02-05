export interface H4Props {
  children: React.ReactNode;
}

export const H4 = ({ children }: H4Props): JSX.Element => (
  <h4 className="mt-8 scroll-m-20 text-xl font-semibold tracking-tight">
    {children}
  </h4>
);
