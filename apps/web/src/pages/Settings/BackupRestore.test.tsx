import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackupRestore } from "./BackupRestore.tsx";

const env = vi.hoisted(() => ({ managed: false }));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { security: { isManaged: env.managed } },
  }),
}));
vi.mock("@core/kmp/hooks", () => ({
  useActiveClient: () => undefined,
  useConfigEditor: () => undefined,
  useSignal: () => false,
}));
vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock(
  "@components/PageComponents/SettingsPages/useDeviceConnected.ts",
  () => ({ useDeviceConnected: () => true }),
);

describe("BackupRestore", () => {
  beforeEach(() => {
    env.managed = false;
  });

  it("offers import and export", () => {
    render(<BackupRestore onFormInit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Choose file…" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export…" })).toBeEnabled();
  });

  it("keeps export but disables import while the radio is managed", () => {
    env.managed = true;
    render(<BackupRestore onFormInit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Choose file…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export…" })).toBeEnabled();
  });
});
