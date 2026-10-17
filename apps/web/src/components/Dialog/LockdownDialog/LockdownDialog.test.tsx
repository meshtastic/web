import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LockdownGate } from "./LockdownDialog.tsx";

const State = Protobuf.Mesh.LockdownStatus_State;

const unlockMock = vi.fn(() => Promise.resolve(1));
const disconnectMock = vi.fn(() => Promise.resolve());
const navigateMock = vi.fn();

const signal = <T,>(value: T) => ({
  value,
  peek: () => value,
  subscribe: () => () => {},
});

let lockdownStatus: Protobuf.Mesh.LockdownStatus | undefined;

const fakeClient = () => ({
  device: {
    lockdownStatus: signal(lockdownStatus),
    isLocked: signal(
      lockdownStatus !== undefined &&
        [State.NEEDS_PROVISION, State.LOCKED, State.UNLOCK_FAILED].includes(
          lockdownStatus.state,
        ),
    ),
    unlock: unlockMock,
  },
  disconnect: vi.fn(),
});

vi.mock("@meshtastic/sdk-react", () => ({
  useActiveClient: () => fakeClient(),
  useSignal: (sig: { value: unknown }) => sig.value,
}));

vi.mock("@app/pages/Connections/useConnections", () => ({
  useConnections: () => ({ disconnect: disconnectMock }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@core/stores", () => ({
  useDeviceStore: (selector: (s: { activeConnectionId: number }) => unknown) =>
    selector({ activeConnectionId: 7 }),
}));

vi.mock("@components/UI/Dialog.tsx", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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

const passphraseInput = () => screen.getByLabelText("Passphrase");
const type = (el: HTMLElement, value: string) =>
  fireEvent.change(el, { target: { value } });

describe("LockdownGate", () => {
  beforeEach(() => {
    unlockMock.mockClear();
    disconnectMock.mockClear();
    navigateMock.mockClear();
    lockdownStatus = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when the device is not locked", () => {
    setStatus(State.UNLOCKED);
    const { container } = render(<LockdownGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it("asks for the passphrase and shows a known lock reason", () => {
    setStatus(State.LOCKED, { lockReason: "token_expired" });
    render(<LockdownGate />);

    expect(
      screen.getByRole("heading", { name: /radio locked/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reason: The previous unlock has expired"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Confirm passphrase")).toBeNull();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeDisabled();
  });

  it("treats an unknown lock reason as locked and shows it as is", () => {
    setStatus(State.LOCKED, { lockReason: "something_new" });
    render(<LockdownGate />);

    expect(screen.getByText("Reason: something_new")).toBeInTheDocument();
    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
  });

  it("unlocks with the passphrase and the default options", () => {
    setStatus(State.LOCKED);
    render(<LockdownGate />);

    type(passphraseInput(), "hunter2");
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    expect(unlockMock).toHaveBeenCalledWith({
      passphrase: "hunter2",
      bootsRemaining: 50,
      validForHours: 0,
      maxSessionSeconds: 0,
    });
    // The passphrase isn't kept once it has been sent.
    expect(passphraseInput()).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /waiting for the radio/i }),
    ).toBeDisabled();
  });

  it("passes the advanced options to unlock", () => {
    setStatus(State.LOCKED);
    render(<LockdownGate />);

    type(passphraseInput(), "hunter2");
    type(screen.getByLabelText("Reboots before it locks again"), "10");
    type(screen.getByLabelText("Expires after (hours)"), "24");
    type(screen.getByLabelText("Session limit (seconds)"), "600");
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    expect(unlockMock).toHaveBeenCalledWith({
      passphrase: "hunter2",
      bootsRemaining: 10,
      validForHours: 24,
      maxSessionSeconds: 600,
    });
  });

  it("rejects a passphrase longer than 32 bytes", () => {
    setStatus(State.LOCKED);
    render(<LockdownGate />);

    type(passphraseInput(), "é".repeat(17)); // 34 bytes in UTF-8
    expect(screen.getByText("Use 1 to 32 bytes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeDisabled();
  });

  it("asks for a new passphrase twice when the radio needs provisioning", () => {
    setStatus(State.NEEDS_PROVISION);
    render(<LockdownGate />);

    expect(
      screen.getByRole("heading", { name: /set a lockdown passphrase/i }),
    ).toBeInTheDocument();
    const submit = screen.getByRole("button", {
      name: "Set passphrase and unlock",
    });

    type(passphraseInput(), "hunter2");
    type(screen.getByLabelText("Confirm passphrase"), "hunter3");
    expect(
      screen.getByText("The passphrases don't match."),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();

    type(screen.getByLabelText("Confirm passphrase"), "hunter2");
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(unlockMock).toHaveBeenCalledWith(
      expect.objectContaining({ passphrase: "hunter2" }),
    );
  });

  it("shows the failure and blocks retries until the backoff ends", () => {
    vi.useFakeTimers();
    setStatus(State.UNLOCK_FAILED, { backoffSeconds: 3 });
    render(<LockdownGate />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The radio rejected the passphrase.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You can try again in 3s.",
    );

    type(passphraseInput(), "hunter2");
    const submit = screen.getByRole("button", { name: "Unlock" });
    expect(submit).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You can try again in 2s.",
    );

    // The countdown re-arms after each render, so step it a second at a time.
    for (let i = 0; i < 2; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByRole("alert")).not.toHaveTextContent("try again");
    expect(submit).toBeEnabled();
  });

  it("allows an immediate retry after a failure without backoff", () => {
    setStatus(State.UNLOCK_FAILED, { backoffSeconds: 0 });
    render(<LockdownGate />);

    type(passphraseInput(), "hunter2");
    expect(screen.getByRole("button", { name: "Unlock" })).toBeEnabled();
  });

  it("disconnects the active connection instead of closing", async () => {
    setStatus(State.LOCKED);
    render(<LockdownGate />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    });

    expect(disconnectMock).toHaveBeenCalledWith(7);
    expect(navigateMock).toHaveBeenCalledWith({ to: "/connections" });
  });
});
