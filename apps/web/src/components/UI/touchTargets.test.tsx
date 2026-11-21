import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Composer } from "@components/Messages/Composer.tsx";
import { MessageActionsBar } from "@components/Messages/MessageActionsBar.tsx";
import { Button } from "@components/UI/Button.tsx";
import { FilterChip } from "@components/UI/FilterChip.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { render, screen, within } from "@testing-library/react";
import { XIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { testEmojiPrefs } from "@app/tests/emojiPrefs.ts";

// Touch screens get 44px targets. Small controls keep their look and grow
// their hit area with `relative pointer-coarse:touch-target`; fields grow.
const TOUCH_TARGET = "pointer-coarse:touch-target";

describe("touch targets", () => {
  it("defines the touch-target utility in the live theme", () => {
    // Vitest runs from apps/web.
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    expect(css).toMatch(/@utility touch-target\s*\{/);
    expect(css).toContain("min(0px, calc((100% - 44px) / 2))");
  });

  it("grows the hit area of small buttons, chips and switches", () => {
    render(
      <>
        <IconButton aria-label="Close" icon={<XIcon />} size="sm" />
        <Button size="sm">Save</Button>
        <FilterChip selected={false}>Unread</FilterChip>
        <Switch aria-label="Transmit" />
      </>,
    );
    for (const name of ["Close", "Save", "Unread"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveClass("relative", TOUCH_TARGET);
    }
    expect(screen.getByRole("switch", { name: "Transmit" })).toHaveClass(
      "relative",
      TOUCH_TARGET,
    );
  });

  it("lets a caller position a control absolutely without losing the hit area", () => {
    render(
      <IconButton
        aria-label="Close"
        icon={<XIcon />}
        className="absolute top-2 right-2"
      />,
    );
    const button = screen.getByRole("button", { name: "Close" });
    expect(button).toHaveClass("absolute", TOUCH_TARGET);
    expect(button).not.toHaveClass("relative");
  });

  it("makes fields 44px tall with 16px text on touch, so iOS does not zoom", () => {
    render(<Input aria-label="Long name" />);
    expect(screen.getByRole("textbox", { name: "Long name" })).toHaveClass(
      "pointer-coarse:h-11",
      "pointer-coarse:text-base",
    );
  });

  it("gives the touch actions bar full-height buttons that share the row", () => {
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
        touch
        emoji={testEmojiPrefs()}
        onReact={() => {}}
        onReply={() => {}}
        onCopy={() => {}}
        onDeliveryDetails={() => {}}
        onRetry={() => {}}
        onMenuOpenChange={() => {}}
        onDismiss={() => {}}
      />,
    );
    const bar = screen.getByRole("toolbar");
    expect(bar).toHaveClass("max-w-full");
    for (const button of within(bar).getAllByRole("button")) {
      expect(button).toHaveClass("h-11", "w-11", "shrink");
    }
  });

  it("keeps the phone composer above the home indicator", () => {
    const { container } = render(
      <Composer
        label="Message Primary"
        placeholder="Message"
        value=""
        onChange={() => {}}
        onSend={() => {}}
        onCancelReply={() => {}}
        emoji={testEmojiPrefs()}
        onTapback={() => {}}
        touch
      />,
    );
    const form = container.querySelector("form");
    expect(form?.className).toContain(
      "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
    );
  });
});
