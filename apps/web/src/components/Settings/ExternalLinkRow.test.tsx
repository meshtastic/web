import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalLinkRow } from "./ExternalLinkRow.tsx";

describe("ExternalLinkRow", () => {
  it("is a link that opens a new tab safely and says so", () => {
    render(
      <ExternalLinkRow
        label="Web Flasher"
        help="Installs firmware over USB."
        actionLabel="Open"
        href="https://flasher.meshtastic.org/"
      />,
    );
    const link = screen.getByRole("link", {
      name: "Open Web Flasher (opens in a new tab)",
    });
    expect(link).toHaveAttribute("href", "https://flasher.meshtastic.org/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAccessibleDescription("Installs firmware over USB.");
  });
});
