export interface PProps {
  children: React.ReactNode;
}

export const P = ({ children }: PProps) => (
  <p className="leading-7 not-first:mt-6">{children}</p>
);
