import type { AddFilterWordError } from "@core/kmp/messageFilter.ts";
import { validateFilterEntry } from "@core/messaging/messageFilter.ts";
import { MessageFilterStorageError } from "@core/storage/messageFilter.ts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "better-result";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { MessageFilterSettings } from "./MessageFilter.tsx";

/** The section over an in-memory list, validated like the real one. */
const Harness = ({
  initial = [],
  failSaves = false,
}: {
  initial?: string[];
  failSaves?: boolean;
}) => {
  const [enabled, setEnabled] = useState(false);
  const [words, setWords] = useState<readonly string[]>(initial);
  const refused = () =>
    Promise.resolve(Result.err(new MessageFilterStorageError("disk full")));
  return (
    <MessageFilterSettings
      available
      enabled={enabled}
      words={words}
      onEnabledChange={(on) => {
        if (failSaves) return refused();
        setEnabled(on);
        return Promise.resolve(Result.ok(undefined));
      }}
      onAdd={(input) => {
        const valid = validateFilterEntry(input, words);
        if (Result.isError(valid)) {
          return Promise.resolve(
            Result.err<string, AddFilterWordError>(valid.error),
          );
        }
        setWords([...words, valid.value]);
        return Promise.resolve(Result.ok(valid.value));
      }}
      onRemove={(word) => {
        setWords(words.filter((w) => w !== word));
        return Promise.resolve(Result.ok(undefined));
      }}
    />
  );
};

describe("MessageFilterSettings", () => {
  it("shows the switch with Android's description and the empty state", () => {
    render(<Harness />);
    const toggle = screen.getByRole("switch", {
      name: "Filter all conversations",
    });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription(
      /Hide messages containing filter words in every channel and DM/,
    );
    expect(screen.getByText("No filter words configured")).toBeVisible();
  });

  it("turns filtering on", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole("switch", {
      name: "Filter all conversations",
    });
    await user.click(toggle);
    expect(toggle).toBeChecked();
  });

  it("adds with Enter and with Add, sorted, telling words from patterns", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole("textbox", { name: "Filter word" });
    expect(field).toHaveAttribute("placeholder", "Add word or regex:pattern");

    await user.type(field, "  spam {Enter}");
    expect(field).toHaveValue("");
    await user.type(field, "regex:buy\\d+");
    await user.click(screen.getByRole("button", { name: "Add" }));

    const list = screen.getByRole("list", { name: "Filter words" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "buy\\d+Regex pattern",
      "spamWhole word match",
    ]);
    expect(screen.queryByText("No filter words configured")).toBeNull();
  });

  it("explains a rejected entry inline and keeps what was typed", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["spam"]} />);
    const field = screen.getByRole("textbox", { name: "Filter word" });

    await user.type(field, "spam{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That’s already in the list.",
    );
    expect(field).toHaveAccessibleDescription("That’s already in the list.");
    expect(field).toHaveAttribute("aria-invalid", "true");

    await user.clear(field);
    expect(screen.queryByRole("alert")).toBeNull();
    await user.type(field, "regex:(oops{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Not a valid regular expression: /,
    );
    expect(field).toHaveValue("regex:(oops");

    await user.clear(field);
    await user.type(field, "regex:{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Add a pattern after regex:",
    );
  });

  it("removes a word", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["spam", "regex:ham+"]} />);
    await user.click(screen.getByRole("button", { name: "Remove ham+" }));
    expect(screen.queryByText("ham+")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Remove spam" }));
    expect(screen.getByText("No filter words configured")).toBeVisible();
  });

  it("says when the switch could not be saved", async () => {
    const user = userEvent.setup();
    render(<Harness failSaves />);
    await user.click(
      screen.getByRole("switch", { name: "Filter all conversations" }),
    );
    expect(
      screen.getByText("Couldn’t save the filter. Try again."),
    ).toBeVisible();
  });

  it("asks for a radio when none is connected", () => {
    const never = vi.fn();
    render(
      <MessageFilterSettings
        available={false}
        enabled={false}
        words={[]}
        onEnabledChange={never}
        onAdd={never}
        onRemove={never}
      />,
    );
    expect(
      screen.getByText(/Connect a radio to edit its message filter/),
    ).toBeVisible();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
