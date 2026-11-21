import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppSettings } from "./AppSettings.tsx";

describe("AppSettings", () => {
  it("shows the version and the short commit it was built from", () => {
    render(
      <AppSettings
        onFormInit={vi.fn()}
        build={{
          version: "v2.7.2",
          commit: "b75f0f41a9c3",
          shortCommit: "b75f0f4",
        }}
      />,
    );
    expect(screen.getByText("v2.7.2")).toBeVisible();
    expect(screen.getByText("b75f0f4")).toBeVisible();
  });

  it("says when the build didn't record them", () => {
    render(
      <AppSettings
        onFormInit={vi.fn()}
        build={{
          version: undefined,
          commit: undefined,
          shortCommit: undefined,
        }}
      />,
    );
    expect(screen.getAllByText("Not available")).toHaveLength(2);
  });
});
