export interface H1Props {
  children: React.ReactNode;
}

export const H1 = ({ children }: H1Props): JSX.Element => (
  <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
    {children}
  </h1>
);
