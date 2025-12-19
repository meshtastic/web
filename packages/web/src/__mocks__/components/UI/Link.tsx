import { vi } from "vitest";

vi.mock("@shared/components/ui/link.tsx", () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a data-testid="link" href={href} className={className}>
      {children}
    </a>
  ),
}));
