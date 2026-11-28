import { testEmojiPrefs } from "@app/tests/emojiPrefs.ts";
import { emojiCatalogLoader } from "@core/emoji/loadCatalog.ts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Composer, type ComposerMentions } from "./Composer.tsx";
import { MessageActionsBar } from "./MessageActionsBar.tsx";
import type { EmojiPrefs } from "./useEmoji.ts";

const SMILEYS = [
  { b: "😀", k: ["cheerful", "face", "grin"] },
  { b: "😃", k: ["big", "eyes", "face"] },
  { b: "😄", k: ["eye", "eyes", "face"] },
  { b: "😁", k: ["beaming", "face", "grin"] },
  { b: "😆", k: ["face", "laugh", "satisfied"] },
  { b: "😅", k: ["face", "smile", "sweat"] },
  { b: "🤣", k: ["face", "floor", "rofl"] },
  { b: "😂", k: ["face", "joy", "tears"] },
  { b: "🙂", k: ["face", "slightly", "smile"] },
  { b: "😉", k: ["face", "wink"] },
];

const DATA = {
  version: "16.0",
  categories: [
    { name: "Smileys & Emotion", icon: "😀", emojis: SMILEYS },
    {
      name: "People & Body",
      icon: "👋",
      emojis: [{ b: "👋", k: ["hand", "wave", "waving"], s: true }],
    },
  ],
};

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
const okData = () =>
  Promise.resolve(new Response(JSON.stringify(DATA), { status: 200 }));

beforeEach(() => {
  emojiCatalogLoader.reset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(okData);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const ComposerHarness = ({
  initial = "",
  replying = false,
  prefs = testEmojiPrefs(),
  onTapback = vi.fn(),
  disabled = false,
  mentions,
}: {
  initial?: string;
  replying?: boolean;
  prefs?: EmojiPrefs;
  onTapback?: (emoji: string) => void;
  disabled?: boolean;
  mentions?: ComposerMentions;
}) => {
  const [value, setValue] = useState(initial);
  const [reply, setReply] = useState(replying);
  return (
    <Composer
      label="Message Primary"
      placeholder="Message #Primary"
      value={value}
      onChange={setValue}
      onSend={vi.fn()}
      disabled={disabled}
      {...(mentions ? { mentions } : {})}
      {...(reply
        ? { replying: { name: "COULLS_BASE", excerpt: "Morning all" } }
        : {})}
      onCancelReply={() => setReply(false)}
      emoji={prefs}
      onTapback={(emoji) => {
        onTapback(emoji);
        setReply(false);
      }}
    />
  );
};

const field = () => screen.getByLabelText("Message Primary");
const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Emoji" }));
  return screen.getByRole("dialog", { name: "Emoji" });
};
const grid = async () =>
  screen.findByRole("group", { name: "Smileys & emotion" });

describe("Composer emoji picker", () => {
  it("loads the catalog once, on first open", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness />);
    expect(fetchMock).not.toHaveBeenCalled();
    await openPicker(user);
    await grid();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toMatch(/emoji\/emoji-data\.json$/);
  });

  it("inserts at the caret, replacing the selection, and counts the pick", async () => {
    const user = userEvent.setup();
    const prefs = testEmojiPrefs();
    render(<ComposerHarness initial="good day" prefs={prefs} />);
    const input = field();
    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error("not a textarea");
    }
    input.focus();
    input.setSelectionRange(5, 8);
    const dialog = await openPicker(user);
    await user.click(
      within(await grid()).getByRole("button", {
        name: "face, joy, tears",
      }),
    );
    expect(input).toHaveValue("good 😂");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(dialog).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe("good 😂".length);
    expect(prefs.recordUse).toHaveBeenCalledWith("😂");
  });

  it("refuses an emoji that won't fit in 200 bytes and says so", async () => {
    const user = userEvent.setup();
    const prefs = testEmojiPrefs();
    render(<ComposerHarness initial={"a".repeat(198)} prefs={prefs} />);
    await openPicker(user);
    await user.click(
      within(await grid()).getByRole("button", { name: "face, joy, tears" }),
    );
    expect(field()).toHaveValue("a".repeat(198));
    expect(
      within(screen.getByRole("dialog", { name: "Emoji" })).getByText(
        /No room for that emoji/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Emoji" })).toBeInTheDocument();
    expect(prefs.recordUse).not.toHaveBeenCalled();
  });

  it("replaces the part of a mention a selection covers, as typing would", async () => {
    const user = userEvent.setup();
    const alice: ComposerMentions = {
      candidates: [],
      name: (num) => (num === 0xffccee11 ? "Alice" : undefined),
    };
    render(<ComposerHarness initial="hi @!ffccee11 there" mentions={alice} />);
    const input = field();
    if (!(input instanceof HTMLTextAreaElement)) {
      throw new Error("not a textarea");
    }
    expect(input).toHaveValue("hi @Alice there");
    input.focus();
    // "ice there": most of the name and everything after it.
    input.setSelectionRange(6, 15);
    await openPicker(user);
    await user.click(
      within(await grid()).getByRole("button", { name: "face, joy, tears" }),
    );
    expect(input).toHaveValue("hi @Al😂");
  });

  it("orders the quick row by frequency", async () => {
    const user = userEvent.setup();
    render(
      <ComposerHarness
        prefs={testEmojiPrefs({ quick: ["🎉", "🔥", "👍", "👎", "😂", "❤️"] })}
      />,
    );
    await openPicker(user);
    const row = screen.getByRole("group", { name: "Frequently used" });
    expect(
      within(row)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["🎉", "🔥", "👍", "👎", "😂", "❤️"]);
  });

  it("moves through the grid with the arrow keys and picks with Enter", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness />);
    await openPicker(user);
    const cells = within(await grid()).getAllByRole("button");
    cells[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(cells[1]).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(cells[9]).toHaveFocus();
    await user.keyboard("{ArrowUp}{End}");
    expect(cells[7]).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(field()).toHaveValue("😂");
  });

  it("searches by keyword and picks the first result with Enter", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness />);
    await openPicker(user);
    const search = await screen.findByRole("searchbox", {
      name: "Search emoji",
    });
    expect(search).toHaveFocus();
    await user.type(search, "WINK");
    const results = screen.getByRole("group", { name: "Search results" });
    expect(within(results).getAllByRole("button")).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(field()).toHaveValue("😉");
  });

  it("applies the preferred skin tone and remembers a new one", async () => {
    const user = userEvent.setup();
    const prefs = testEmojiPrefs({ skinTone: 3 });
    render(<ComposerHarness prefs={prefs} />);
    await openPicker(user);
    await user.click(
      await screen.findByRole("button", { name: "People & body" }),
    );
    expect(
      screen.getByRole("button", { name: "hand, wave, waving" }),
    ).toHaveTextContent("👋🏽");
    await user.click(screen.getByRole("radio", { name: "Dark skin tone" }));
    expect(prefs.setSkinTone).toHaveBeenCalledWith(5);
    await user.click(
      screen.getByRole("button", { name: "hand, wave, waving" }),
    );
    expect(field()).toHaveValue("👋🏽");
  });

  it("shows a load failure with a retry", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    render(<ComposerHarness />);
    await openPicker(user);
    expect(
      await screen.findByText("Couldn't load the emoji"),
    ).toBeInTheDocument();
    // The quick row still works without the catalog.
    expect(
      screen.getByRole("group", { name: "Frequently used" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await grid()).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("Esc closes the picker only, returning focus to the button", async () => {
    const user = userEvent.setup();
    render(<ComposerHarness replying />);
    await openPicker(user);
    await grid();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Replying to COULLS_BASE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Emoji" })).toHaveFocus();
    // With the picker closed, Esc cancels the reply again.
    field().focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Replying to COULLS_BASE")).toBeNull();
  });

  it("is disabled when not connected", () => {
    render(<ComposerHarness disabled />);
    expect(screen.getByRole("button", { name: "Emoji" })).toBeDisabled();
  });
});

describe("Composer emoji picker while replying", () => {
  it("sends a quick emoji as a tapback and ends the reply", async () => {
    const user = userEvent.setup();
    const onTapback = vi.fn();
    const prefs = testEmojiPrefs();
    render(<ComposerHarness replying onTapback={onTapback} prefs={prefs} />);
    await openPicker(user);
    const row = screen.getByRole("group", { name: "Tapback to COULLS_BASE" });
    await user.click(within(row).getAllByRole("button")[2] ?? row);
    expect(onTapback).toHaveBeenCalledWith("😂");
    expect(field()).toHaveValue("");
    expect(screen.queryByText("Replying to COULLS_BASE")).toBeNull();
    expect(prefs.recordUse).toHaveBeenCalledWith("😂");
    expect(field()).toHaveFocus();
  });

  it("sends grid picks as tapbacks while the mode is on, inserts when off", async () => {
    const user = userEvent.setup();
    const onTapback = vi.fn();
    render(<ComposerHarness replying onTapback={onTapback} />);
    await openPicker(user);
    const mode = screen.getByRole("switch", { name: /Send as tapback/ });
    expect(mode).toBeChecked();
    await user.click(mode);
    expect(mode).not.toBeChecked();
    await user.click(
      within(await grid()).getByRole("button", { name: "face, wink" }),
    );
    expect(onTapback).not.toHaveBeenCalled();
    expect(field()).toHaveValue("😉");
    expect(screen.getByText("Replying to COULLS_BASE")).toBeInTheDocument();

    // Still the same reply: the mode stays off.
    await openPicker(user);
    expect(
      screen.getByRole("switch", { name: /Send as tapback/ }),
    ).not.toBeChecked();
    await user.click(screen.getByRole("switch", { name: /Send as tapback/ }));
    await user.click(
      within(await grid()).getByRole("button", { name: "face, wink" }),
    );
    expect(onTapback).toHaveBeenCalledWith("😉");
  });
});

describe("MessageActionsBar", () => {
  const renderBar = (prefs: EmojiPrefs, onReact = vi.fn()) => {
    render(
      <MessageActionsBar
        available={{
          react: true,
          reply: true,
          copy: true,
          deliveryDetails: false,
          retry: false,
        }}
        side="end"
        emoji={prefs}
        onReact={onReact}
        onReply={vi.fn()}
        onCopy={vi.fn()}
        onDeliveryDetails={vi.fn()}
        onRetry={vi.fn()}
        onMenuOpenChange={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    return onReact;
  };

  it("shows the six most used emoji in order; a tap reacts without counting", async () => {
    const user = userEvent.setup();
    const prefs = testEmojiPrefs({
      quick: ["🎉", "🔥", "👍", "👎", "😂", "❤️"],
    });
    const onReact = renderBar(prefs);
    const bar = screen.getByRole("toolbar", { name: "Message actions" });
    const quick = within(bar)
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-label")?.startsWith("React with"));
    expect(quick.map((b) => b.textContent)).toEqual([
      "🎉",
      "🔥",
      "👍",
      "👎",
      "😂",
      "❤️",
    ]);
    await user.click(quick[0] ?? bar);
    expect(onReact).toHaveBeenCalledWith("🎉");
    expect(prefs.recordUse).not.toHaveBeenCalled();
  });

  it("reacts from the full picker and counts that pick", async () => {
    const user = userEvent.setup();
    const prefs = testEmojiPrefs();
    const onReact = renderBar(prefs);
    await user.click(screen.getByRole("button", { name: "More reactions" }));
    const dialog = screen.getByRole("dialog", { name: "Pick a reaction" });
    await user.click(
      await within(dialog).findByRole("button", {
        name: "face, slightly, smile",
      }),
    );
    expect(onReact).toHaveBeenCalledWith("🙂");
    expect(prefs.recordUse).toHaveBeenCalledWith("🙂");
  });
});
