import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./ShareButton.tsx";

const env = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: env.toast }),
}));

const shareRejecting = (name: string) => {
  const error = new Error(name);
  error.name = name;
  const share = vi.fn().mockRejectedValue(error);
  vi.stubGlobal("navigator", { ...navigator, share });
  return share;
};

describe("ShareButton", () => {
  beforeEach(() => env.toast.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing without the Web Share API", () => {
    render(<ShareButton url="https://meshtastic.org/e/#x" />);
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  });

  it("stays quiet when the share sheet is closed", async () => {
    const share = shareRejecting("AbortError");
    render(<ShareButton url="https://meshtastic.org/e/#x" title="Hikers" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith({
      title: "Hikers",
      url: "https://meshtastic.org/e/#x",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(env.toast).not.toHaveBeenCalled();
  });

  it("reports any other failure", async () => {
    shareRejecting("NotAllowedError");
    render(<ShareButton url="https://meshtastic.org/e/#x" />);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() =>
      expect(env.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Couldn't open the share sheet: NotAllowedError",
          variant: "destructive",
        }),
      ),
    );
  });
});
