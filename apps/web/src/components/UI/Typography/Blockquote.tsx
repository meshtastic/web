export interface BlockquoteProps {
  children: React.ReactNode;
}

export const BlockQuote = ({ children }: BlockquoteProps) => (
  <blockquote className="mt-6 border-l-2 border-control pl-6 italic text-secondary">
    {children}
  </blockquote>
);
