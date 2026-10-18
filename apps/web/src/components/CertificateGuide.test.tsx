import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateGuide, detectCertBrowser } from "./CertificateGuide.tsx";

describe("detectCertBrowser", () => {
  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Gecko/20100101 Firefox/150.0",
      "firefox",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15",
      "safari",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
      "chromium",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0",
      "chromium",
    ],
  ])("%s → %s", (ua, browser) => {
    expect(detectCertBrowser(ua)).toBe(browser);
  });
});

describe("CertificateGuide", () => {
  const open = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("open", open);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    open.mockReset();
  });

  const openRadio = () =>
    fireEvent.click(screen.getByRole("button", { name: /open radio/i }));

  it("words the title as a likely cause when the failure is uncertain", () => {
    render(
      <CertificateGuide
        uncertain
        url="https://192.168.1.10"
        retest={vi.fn()}
      />,
    );
    expect(screen.getByText(/may not trust its certificate/i)).toBeTruthy();
  });

  it("opens the radio in a new tab", () => {
    render(<CertificateGuide url="https://192.168.1.10" retest={vi.fn()} />);
    openRadio();
    expect(open).toHaveBeenCalledWith(
      "https://192.168.1.10",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("re-tests when the user comes back and reports success", async () => {
    const retest = vi.fn().mockResolvedValue(true);
    const onTrusted = vi.fn();
    render(
      <CertificateGuide
        url="https://192.168.1.10"
        retest={retest}
        onTrusted={onTrusted}
      />,
    );
    openRadio();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(retest).toHaveBeenCalled();
    expect(onTrusted).toHaveBeenCalledTimes(1);
  });

  it("ignores a re-test that finishes after the guide unmounts", async () => {
    let finish: (trusted: boolean) => void = () => {};
    const retest = vi.fn(
      () => new Promise<boolean>((resolve) => (finish = resolve)),
    );
    const onTrusted = vi.fn();
    const { unmount } = render(
      <CertificateGuide
        url="https://192.168.1.10"
        retest={retest}
        onTrusted={onTrusted}
      />,
    );
    openRadio();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(retest).toHaveBeenCalled();

    unmount();
    await act(async () => finish(true));
    expect(onTrusted).not.toHaveBeenCalled();
  });

  it("keeps polling while waiting, then gives up", async () => {
    const retest = vi.fn().mockResolvedValue(false);
    render(<CertificateGuide url="https://192.168.1.10" retest={retest} />);
    openRadio();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(retest).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(
      screen.getByRole("button", { name: /open radio again/i }),
    ).toBeTruthy();
    const calls = retest.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(retest.mock.calls.length).toBe(calls);
  });
});
