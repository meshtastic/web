import { vi } from "vitest";

vi.mock("@shared/components/ui/checkbox.tsx", () => ({
  Checkbox: ({
    id,
    checked,
    onChange,
  }: {
    id: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <input
      data-testid="checkbox"
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
    />
  ),
}));
