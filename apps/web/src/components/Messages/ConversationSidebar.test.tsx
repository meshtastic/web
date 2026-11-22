import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentPropsWithoutRef } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ConversationRowView } from "./ConversationRow.tsx";
import { ConversationSidebar } from "./ConversationSidebar.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    activeOptions: _activeOptions,
    ...props
  }: ComponentPropsWithoutRef<"a"> & {
    to: string;
    params?: unknown;
    activeOptions?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const channel = (
  index: number,
  title: string,
  extra: Partial<ConversationRowView> = {},
): ConversationRowView => ({
  id: `channel:${index}`,
  kind: "channel",
  title,
  initials: "#",
  online: false,
  favorite: false,
  muted: false,
  unread: 0,
  route: { type: "broadcast", chatId: index },
  ...extra,
});

const dm: ConversationRowView = {
  id: "direct:7",
  kind: "dm",
  title: "COULLS_BASE",
  initials: "CB",
  nodeNum: 7,
  online: true,
  favorite: false,
  muted: false,
  unread: 1,
  preview: "Morning all",
  route: { type: "direct", chatId: 7 },
};

describe("ConversationSidebar", () => {
  it("lists channels and DMs, marks a muted channel, and opens search", async () => {
    const user = userEvent.setup();
    const onOpenSearch = vi.fn();
    const onFilterChange = vi.fn();
    render(
      <ConversationSidebar
        layout="sections"
        channels={[
          channel(0, "Primary"),
          channel(1, "Hiking", { muted: true, unread: 4 }),
        ]}
        direct={[dm]}
        filter="all"
        onFilterChange={onFilterChange}
        onOpenSearch={onOpenSearch}
        shortcut="⌘K"
        onNewDirectMessage={vi.fn()}
        onAddChannel={vi.fn()}
        selectedId="channel:0"
      />,
    );
    expect(screen.getByRole("link", { name: /Primary/ })).toBeInTheDocument();
    const muted = screen.getByRole("link", { name: /Hiking/ });
    expect(within(muted).getByText(/Muted/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /COULLS_BASE/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Search/ }));
    expect(onOpenSearch).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Unread" }));
    expect(onFilterChange).toHaveBeenCalledWith("unread");
  });
});
