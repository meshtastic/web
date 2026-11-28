import { render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ConversationRow,
  type ConversationRowView,
} from "./ConversationRow.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    ...props
  }: ComponentPropsWithoutRef<"a"> & { to: string; params?: unknown }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const row = (
  extra: Partial<ConversationRowView> = {},
): ConversationRowView => ({
  id: "channel:1",
  kind: "channel",
  title: "LongFast",
  initials: "#",
  online: false,
  favorite: false,
  muted: true,
  unread: 3,
  preview: "Alice: hi @Base Camp",
  time: "9:21",
  route: { type: "broadcast", chatId: 1 },
  ...extra,
});

const badge = () =>
  screen.getByText("3").closest(".rounded-full") as HTMLElement;

describe("ConversationRow mentions", () => {
  it("keeps a muted channel's unread count quiet without a mention", () => {
    render(<ConversationRow row={row()} selected={false} />);
    expect(screen.queryByText("Mentions you")).toBeNull();
    expect(badge().className).toContain("bg-raised");
  });

  it("breaks through the mute with an @ badge when I'm mentioned", () => {
    const { container } = render(
      <ConversationRow row={row({ mentioned: true })} selected={false} />,
    );
    expect(screen.getByText("Mentions you")).toBeInTheDocument();
    expect(container.querySelector("[data-mention-badge]")).not.toBeNull();
    expect(badge().className).not.toContain("bg-raised");
    expect(screen.getByText("9:21").className).toContain("text-accent");
  });
});
