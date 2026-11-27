import { SettingsReadOnlyContext } from "@components/Settings/SettingsReadOnly.tsx";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Administration } from "./Administration.tsx";

const setDialogOpen = vi.fn();

vi.mock("@core/stores", () => ({ useDevice: () => ({ setDialogOpen }) }));
vi.mock("@core/kmp/hooks", () => ({ useActiveClient: () => undefined }));
vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock(
  "@components/PageComponents/SettingsPages/useDeviceConnected.ts",
  () => ({ useDeviceConnected: () => true }),
);

const renderPage = (readOnly: boolean) =>
  render(
    <SettingsReadOnlyContext.Provider value={readOnly}>
      <Administration onFormInit={vi.fn()} />
    </SettingsReadOnlyContext.Provider>,
  );

describe("Administration", () => {
  beforeEach(() => setDialogOpen.mockClear());

  it("opens an action's dialog", () => {
    renderPage(false);
    fireEvent.click(screen.getByRole("button", { name: "Reboot…" }));
    expect(setDialogOpen).toHaveBeenCalledWith("reboot", true);
  });

  it("disables every action while settings are read-only", () => {
    renderPage(true);
    for (const name of ["Reboot…", /Factory reset/u]) {
      for (const button of screen.getAllByRole("button", { name })) {
        expect(button).toBeDisabled();
      }
    }
  });
});
