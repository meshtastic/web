export interface H3Props {
  children: React.ReactNode;
}

export const H3 = ({ children }: H3Props): JSX.Element => (
  <h3 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">
    {children}
  </h3>
);
