import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LockdownSection } from "./LockdownSection.tsx";

const State = Protobuf.Mesh.LockdownStatus_State;

const lockNowMock = vi.fn(() => Promise.resolve(1));
const disableMock = vi.fn(() => Promise.resolve(1));
let lockdownStatus: Protobuf.Mesh.LockdownStatus | undefined;

vi.mock("@core/hooks/useLockdown.ts", () => ({
  useLockdown: () => ({
    client: {
      device: { lockNow: lockNowMock, disableLockdown: disableMock },
    },
    status: lockdownStatus,
    isLocked: false,
  }),
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@components/UI/Dialog.tsx", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogClose: () => null,
}));

const setStatus = (
  state: Protobuf.Mesh.LockdownStatus_State,
  fields: {
    lockReason?: string;
    bootsRemaining?: number;
    validUntilEpoch?: number;
    backoffSeconds?: number;
  } = {},
) => {
  lockdownStatus = create(Protobuf.Mesh.LockdownStatusSchema, {
    state,
    ...fields,
  });
};

describe("LockdownSection", () => {
  beforeEach(() => {
    lockNowMock.mockClear();
    disableMock.mockClear();
    lockdownStatus = undefined;
  });

  it("is hidden when the firmware reports no lockdown status", () => {
    const { container } = render(<LockdownSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a disabled lockdown as off, without actions", () => {
    setStatus(State.DISABLED);
    render(<LockdownSection />);
    expect(screen.getByTestId("lockdown-state")).toHaveTextContent("Off");
    expect(screen.queryByRole("button", { name: "Lock now" })).toBeNull();
  });

  it("shows the unlock's boots and expiry, and locks now", () => {
    setStatus(State.UNLOCKED, {
      bootsRemaining: 42,
      validUntilEpoch: 1_900_000_000,
    });
    render(<LockdownSection />);

    expect(screen.getByTestId("lockdown-state")).toHaveTextContent("Unlocked");
    expect(screen.getByText("Reboots remaining: 42")).toBeInTheDocument();
    expect(screen.getByText(/^Expires: /)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lock now" }));
    expect(lockNowMock).toHaveBeenCalled();
  });

  it("hides the expiry when the unlock has no time limit", () => {
    setStatus(State.UNLOCKED, { bootsRemaining: 5, validUntilEpoch: 0 });
    render(<LockdownSection />);
    expect(screen.queryByText(/^Expires: /)).toBeNull();
  });

  it("disables lockdown only with the passphrase and confirmation", () => {
    setStatus(State.UNLOCKED, { bootsRemaining: 5 });
    render(<LockdownSection />);

    fireEvent.click(screen.getByRole("button", { name: "Disable lockdown" }));
    const submit = screen
      .getAllByRole("button", { name: "Disable lockdown" })
      .find((b) => b.getAttribute("type") === "submit");
    expect(submit).toBeDefined();
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Passphrase"), {
      target: { value: "hunter2" },
    });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByText("I understand that this can't be undone"));
    expect(submit).toBeEnabled();
    fireEvent.click(submit as HTMLElement);

    expect(disableMock).toHaveBeenCalledWith("hunter2");
  });
});
