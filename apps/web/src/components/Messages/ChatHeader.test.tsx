import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ChatHeaderActions,
  type ChatHeaderFilterProps,
} from "./ChatHeader.tsx";

const filterProps = (
  overrides: Partial<ChatHeaderFilterProps> = {},
): ChatHeaderFilterProps => ({
  enabled: true,
  optedOut: false,
  filteredCount: 0,
  revealed: false,
  onOptedOutChange: vi.fn(),
  onRevealedChange: vi.fn(),
  onOpenSettings: vi.fn(),
  ...overrides,
});

const renderMenu = async (filter: ChatHeaderFilterProps) => {
  const user = userEvent.setup();
  render(
    <ChatHeaderActions
      kind="channel"
      compact={false}
      connected
      onClearConversation={vi.fn()}
      onDeleteAllMessages={vi.fn()}
      filter={filter}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "More conversation actions" }),
  );
  return user;
};

describe("ChatHeaderActions message filter", () => {
  it("offers Filter messages as a checked item while filtering is on", async () => {
    const filter = filterProps();
    const user = await renderMenu(filter);
    const item = screen.getByRole("menuitemcheckbox", {
      name: "Filter messages",
    });
    expect(item).toHaveAttribute("aria-checked", "true");
    await user.click(item);
    expect(filter.onOptedOutChange).toHaveBeenCalledWith(true);
  });

  it("shows the item unchecked for a conversation that opted out", async () => {
    const filter = filterProps({ optedOut: true });
    const user = await renderMenu(filter);
    const item = screen.getByRole("menuitemcheckbox", {
      name: "Filter messages",
    });
    expect(item).toHaveAttribute("aria-checked", "false");
    await user.click(item);
    expect(filter.onOptedOutChange).toHaveBeenCalledWith(false);
  });

  it("hides the toggle while filtering is off, keeping the settings link", async () => {
    const filter = filterProps({ enabled: false, filteredCount: 3 });
    const user = await renderMenu(filter);
    expect(screen.queryByRole("menuitemcheckbox")).toBeNull();
    expect(screen.queryByText(/filtered$/)).toBeNull();
    await user.click(
      screen.getByRole("menuitem", { name: "Message filter settings" }),
    );
    expect(filter.onOpenSettings).toHaveBeenCalled();
  });

  it("offers Show / Hide N filtered when some are hidden", async () => {
    const filter = filterProps({ filteredCount: 2 });
    const user = await renderMenu(filter);
    await user.click(screen.getByRole("menuitem", { name: "Show 2 filtered" }));
    expect(filter.onRevealedChange).toHaveBeenCalledWith(true);
  });

  it("offers Hide N filtered once revealed", async () => {
    await renderMenu(filterProps({ filteredCount: 2, revealed: true }));
    expect(
      screen.getByRole("menuitem", { name: "Hide 2 filtered" }),
    ).toBeVisible();
  });
});
