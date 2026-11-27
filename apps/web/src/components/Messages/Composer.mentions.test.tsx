import { testEmojiPrefs } from "@app/tests/emojiPrefs.ts";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Composer, type ComposerMentions } from "./Composer.tsx";
import type { MentionSuggestion } from "./MentionSuggestions.tsx";

const ALICE = 0xffccee11;
const BOB = 0x0000beef;

const candidates: MentionSuggestion[] = [
  {
    num: ALICE,
    id: "!ffccee11",
    longName: "Alice",
    shortName: "ALC",
    name: "Alice",
    initials: "ALC",
    online: true,
  },
  {
    num: BOB,
    id: "!0000beef",
    longName: "Bob Base",
    shortName: "BOB",
    name: "Bob Base",
    initials: "BOB",
    online: false,
  },
];
const names = new Map([
  [ALICE, "Alice"],
  [BOB, "Bob Base"],
]);
const mentions: ComposerMentions = {
  candidates,
  name: (num) => names.get(num),
};

const Harness = ({
  initial = "",
  onSend = vi.fn(),
  onDraft = vi.fn(),
}: {
  initial?: string;
  onSend?: (text: string) => void;
  onDraft?: (text: string) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <Composer
      label="Message Primary"
      placeholder="Message #Primary"
      value={value}
      onChange={(text) => {
        onDraft(text);
        setValue(text);
      }}
      onSend={onSend}
      mentions={mentions}
      onCancelReply={vi.fn()}
      emoji={testEmojiPrefs()}
      onTapback={vi.fn()}
    />
  );
};

const field = () =>
  screen.getByLabelText("Message Primary") as HTMLTextAreaElement;
const listbox = () => screen.queryByRole("listbox", { name: "Mention a node" });

describe("Composer @mentions", () => {
  it("offers known nodes on @, filtered as you type", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), "hi @");
    const list = listbox();
    expect(list).not.toBeNull();
    expect(
      within(list as HTMLElement)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["ALCAliceALC · !ffccee11", "BOBBob BaseBOB · !0000beef"]);
    expect(field()).toHaveAttribute("aria-controls", list?.id);
    await user.type(field(), "bo");
    const options = within(listbox() as HTMLElement).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("matches the hex id too", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), "@!0000");
    expect(
      within(listbox() as HTMLElement).getByRole("option"),
    ).toHaveTextContent("Bob Base");
  });

  it("picks with the arrows and Enter: shows the name, sends the token", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Harness onSend={onSend} />);
    await user.type(field(), "hi @");
    expect(field()).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining(String(ALICE)),
    );
    await user.keyboard("{ArrowDown}");
    expect(field()).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining(String(BOB)),
    );
    await user.keyboard("{Enter}");
    // Enter picked, it didn't send.
    expect(onSend).not.toHaveBeenCalled();
    expect(field().value).toBe("hi @Bob Base ");
    expect(listbox()).toBeNull();
    await user.type(field(), "there{Enter}");
    expect(onSend).toHaveBeenCalledWith("hi @!0000beef there");
  });

  it("picks with Tab and with a click", async () => {
    const user = userEvent.setup();
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    await user.type(field(), "@al");
    await user.keyboard("{Tab}");
    expect(field().value).toBe("@Alice ");
    expect(onDraft).toHaveBeenLastCalledWith("@!ffccee11 ");
    await user.type(field(), "@b");
    await user.click(
      within(listbox() as HTMLElement).getByRole("option", {
        name: /Bob Base/u,
      }),
    );
    expect(field().value).toBe("@Alice @Bob Base ");
    expect(onDraft).toHaveBeenLastCalledWith("@!ffccee11 @!0000beef ");
    expect(field()).toHaveFocus();
  });

  it("closes on Escape without picking", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(field(), "@a");
    expect(listbox()).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(listbox()).toBeNull();
    expect(field().value).toBe("@a");
  });

  it("shows a stored draft's tokens as names", () => {
    render(<Harness initial="ping @!ffccee11 and @!12345678" />);
    expect(field().value).toBe("ping @Alice and @!12345678");
  });

  it("Backspace after a mention removes all of it", async () => {
    const user = userEvent.setup();
    const onDraft = vi.fn();
    render(<Harness initial="hi @!ffccee11" onDraft={onDraft} />);
    await user.click(field());
    field().setSelectionRange(9, 9);
    await user.keyboard("{Backspace}");
    expect(field().value).toBe("hi ");
    expect(onDraft).toHaveBeenLastCalledWith("hi ");
  });

  it("a soft keyboard's delete (beforeinput) removes all of a mention", () => {
    const onDraft = vi.fn();
    render(<Harness initial="hi @!ffccee11" onDraft={onDraft} />);
    field().focus();
    field().setSelectionRange(9, 9);
    const event = new InputEvent("beforeinput", {
      inputType: "deleteContentBackward",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      field().dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(onDraft).toHaveBeenLastCalledWith("hi ");
    expect(field().value).toBe("hi ");
  });

  it("typing inside a mention turns it into plain text", async () => {
    const user = userEvent.setup();
    const onDraft = vi.fn();
    render(<Harness initial="@!ffccee11 hi" onDraft={onDraft} />);
    await user.click(field());
    field().setSelectionRange(3, 3);
    await user.keyboard("x");
    expect(field().value).toBe("@Alxice hi");
    expect(onDraft).toHaveBeenLastCalledWith("@Alxice hi");
  });

  it("counts the bytes that will be sent, not the names shown", () => {
    render(<Harness initial="@!0000beef" />);
    // "@Bob Base" is 9 characters; the token is 10 bytes.
    expect(field().value).toBe("@Bob Base");
    expect(screen.getByText("10/200")).toBeInTheDocument();
  });
});
