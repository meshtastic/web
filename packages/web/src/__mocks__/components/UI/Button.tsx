import { vi } from "vitest";

vi.mock("@shared/components/ui/button.tsx", () => ({
  Button: ({
    children,
    name,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    variant: string;
    name: string;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      name={name}
      data-testid={`button-${name}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));
