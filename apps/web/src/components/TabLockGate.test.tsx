import { TabLockGate } from "@components/TabLockGate.tsx";
import {
  createFakeChannelHub,
  createFakeLocks,
} from "@app/tests/fakeTabEnvironment.ts";
import { createTabLock } from "@core/tabLock.ts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

function environment() {
  const locks = createFakeLocks();
  const hub = createFakeChannelHub();
  const mounts = { storage: vi.fn(), connect: vi.fn() };
  const tab = () => {
    const disconnectAll = vi.fn(async () => {});
    const lock = createTabLock({
      locks,
      openChannel: (name) => hub.open(name),
      onRelinquish: disconnectAll,
    });
    lock.start();
    return { lock, disconnectAll };
  };
  function App() {
    useEffect(() => {
      mounts.storage();
      mounts.connect();
    }, []);
    return <p>app</p>;
  }
  return { tab, mounts, App };
}

describe("TabLockGate", () => {
  it("mounts the app in the first tab", async () => {
    const { tab, mounts, App } = environment();
    const a = tab();
    render(
      <TabLockGate lock={a.lock}>
        <App />
      </TabLockGate>,
    );
    expect(await screen.findByText("app")).toBeTruthy();
    expect(mounts.connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the overlay in a second tab and mounts nothing", async () => {
    const { tab, mounts, App } = environment();
    const a = tab();
    render(
      <TabLockGate lock={a.lock}>
        <App />
      </TabLockGate>,
    );
    await screen.findByText("app");
    mounts.connect.mockClear();
    mounts.storage.mockClear();

    const b = tab();
    render(
      <TabLockGate lock={b.lock}>
        <App />
      </TabLockGate>,
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Meshtastic is open in another tab",
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    // Taking over can't reach tabs on another site, so it says so.
    expect(dialog).toHaveAccessibleDescription(
      /tabs on another site or port, and other apps, can't be switched from here/,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Use here" }),
    );
    expect(mounts.connect).not.toHaveBeenCalled();
    expect(mounts.storage).not.toHaveBeenCalled();
  });

  it("moves the app to the tab whose Use here was pressed", async () => {
    const { tab, App } = environment();
    const a = tab();
    const b = tab();
    const first = render(
      <TabLockGate lock={a.lock}>
        <p>owner A</p>
      </TabLockGate>,
    );
    await screen.findByText("owner A");
    const second = render(
      <TabLockGate lock={b.lock}>
        <App />
      </TabLockGate>,
    );
    await userEvent.click(
      await within(second.container).findByRole("button", { name: "Use here" }),
    );

    await waitFor(() =>
      expect(within(second.container).getByText("app")).toBeTruthy(),
    );
    expect(a.disconnectAll).toHaveBeenCalledTimes(1);
    expect(await within(first.container).findByRole("dialog")).toBeTruthy();
    expect(within(first.container).queryByText("owner A")).toBeNull();
  });

  it("paints the overlay in the stored theme before the app mounts", async () => {
    localStorage.setItem("theme", "dark");
    document.documentElement.removeAttribute("data-theme");
    const { tab, App } = environment();
    const a = tab();
    render(
      <TabLockGate lock={a.lock}>
        <App />
      </TabLockGate>,
    );
    await screen.findByText("app");
    const b = tab();
    render(
      <TabLockGate lock={b.lock}>
        <App />
      </TabLockGate>,
    );
    await screen.findByRole("dialog");

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    localStorage.removeItem("theme");
  });

  it("shows the overlay, with Use here disabled, while the lock is still being asked for", () => {
    const pending = {
      start: () => {},
      takeOver: () => {},
      getStatus: () => "pending" as const,
      subscribe: () => () => {},
    };
    render(
      <TabLockGate lock={pending}>
        <p>app</p>
      </TabLockGate>,
    );

    expect(screen.queryByText("app")).toBeNull();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button").hasAttribute("disabled")).toBe(
      true,
    );
  });
});
