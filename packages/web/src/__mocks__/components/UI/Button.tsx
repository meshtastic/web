import { vi } from "vitest";

vi.mock("@components/UI/Button.tsx", () => ({
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
