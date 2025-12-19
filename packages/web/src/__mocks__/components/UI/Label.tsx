import { vi } from "vitest";

vi.mock("@shared/components/ui/label.tsx", () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode;
    htmlFor: string;
    className?: string;
  }) => (
    <label data-testid="label" htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));
