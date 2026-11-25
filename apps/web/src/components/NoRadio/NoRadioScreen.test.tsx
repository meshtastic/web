import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NoRadioEmptyState } from "./NoRadioScreen.tsx";

describe("NoRadioEmptyState", () => {
  it("offers only Connect a radio when no saved radio was reached", () => {
    const onConnect = vi.fn();
    render(
      <NoRadioEmptyState
        reconnecting={false}
        onConnect={onConnect}
        onReconnect={vi.fn()}
        onDownloadDiagnostics={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "No radio connected" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reconnect/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Connect a radio" }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects the most recent radio in one click", () => {
    const onReconnect = vi.fn();
    render(
      <NoRadioEmptyState
        recent={{ id: 1, name: "USB radio" }}
        reconnecting={false}
        onConnect={vi.fn()}
        onReconnect={onReconnect}
        onDownloadDiagnostics={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reconnect USB radio" }),
    );
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("names the radio when its name is known", () => {
    render(
      <NoRadioEmptyState
        recent={{ id: 1, name: "USB radio", radioName: "EAO1 Base" }}
        reconnecting={false}
        onConnect={vi.fn()}
        onReconnect={vi.fn()}
        onDownloadDiagnostics={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reconnect EAO1 Base" }),
    ).toBeInTheDocument();
  });

  it("disables Reconnect while it is connecting", () => {
    render(
      <NoRadioEmptyState
        recent={{ id: 1, name: "USB radio" }}
        reconnecting
        onConnect={vi.fn()}
        onReconnect={vi.fn()}
        onDownloadDiagnostics={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Connecting to USB radio…" }),
    ).toBeDisabled();
  });

  it("offers a diagnostics download even with no saved radio", () => {
    const onDownloadDiagnostics = vi.fn();
    render(
      <NoRadioEmptyState
        reconnecting={false}
        onConnect={vi.fn()}
        onReconnect={vi.fn()}
        onDownloadDiagnostics={onDownloadDiagnostics}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download diagnostics" }),
    );
    expect(onDownloadDiagnostics).toHaveBeenCalledTimes(1);
  });

  it("offers cookie settings only when consent is part of the build", () => {
    const { rerender } = render(
      <NoRadioEmptyState
        reconnecting={false}
        onConnect={vi.fn()}
        onReconnect={vi.fn()}
        onDownloadDiagnostics={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cookie settings" }),
    ).not.toBeInTheDocument();

    const onOpenCookieConsent = vi.fn();
    rerender(
      <NoRadioEmptyState
        reconnecting={false}
        onConnect={vi.fn()}
        onReconnect={vi.fn()}
        onDownloadDiagnostics={vi.fn()}
        onOpenCookieConsent={onOpenCookieConsent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    expect(onOpenCookieConsent).toHaveBeenCalledTimes(1);
  });
});
