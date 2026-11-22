import { fireEvent, render, screen, within } from "@testing-library/react";
import { RadioTowerIcon, UserIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { SettingsNav, type SettingsNavGroup } from "./SettingsNav.tsx";

const groups: SettingsNavGroup<"user" | "lora">[] = [
  {
    id: "configuration",
    label: "Configuration",
    items: [
      { id: "user", label: "User", icon: UserIcon, dirty: false },
      { id: "lora", label: "LoRa", icon: RadioTowerIcon, dirty: true },
    ],
  },
];

describe("SettingsNav", () => {
  it("marks the active section and dirty sections", () => {
    render(
      <SettingsNav
        title="Settings"
        groups={groups}
        activeId="user"
        onSelect={vi.fn()}
        query=""
        onQueryChange={vi.fn()}
      />,
    );
    const user = screen.getByRole("button", { name: "User" });
    expect(user).toHaveAttribute("aria-current", "page");
    const lora = screen.getByRole("button", { name: /LoRa/ });
    expect(lora).not.toHaveAttribute("aria-current");
    expect(
      within(lora).getByRole("img", { name: "Unsaved changes" }),
    ).toBeInTheDocument();
  });

  it("selects a section and forwards the search text", () => {
    const onSelect = vi.fn();
    const onQueryChange = vi.fn();
    render(
      <SettingsNav
        title="Settings"
        groups={groups}
        activeId="user"
        onSelect={onSelect}
        query=""
        onQueryChange={onQueryChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /LoRa/ }));
    expect(onSelect).toHaveBeenCalledWith("lora");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search settings" }),
      {
        target: { value: "lo" },
      },
    );
    expect(onQueryChange).toHaveBeenCalledWith("lo");
  });

  it("says so when the search matches nothing", () => {
    render(
      <SettingsNav
        title="Settings"
        groups={[]}
        activeId={undefined}
        onSelect={vi.fn()}
        query="zzz"
        onQueryChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No settings match “zzz”.",
    );
  });

  describe("subitems", () => {
    const withSubitems: SettingsNavGroup<"user" | "device">[] = [
      {
        id: "configuration",
        label: "Configuration",
        items: [
          { id: "user", label: "User", icon: UserIcon, dirty: false },
          {
            id: "device",
            label: "Device configuration",
            icon: RadioTowerIcon,
            dirty: true,
            subitems: [
              { id: "device", label: "Device", dirty: false },
              { id: "power", label: "Power", dirty: true },
            ],
          },
        ],
      },
    ];

    it("lists them under their section and marks the open one", () => {
      render(
        <SettingsNav
          title="Settings"
          groups={withSubitems}
          activeId="device"
          activeSubId="power"
          onSelect={vi.fn()}
          query=""
          onQueryChange={vi.fn()}
        />,
      );
      const list = screen.getByRole("list", { name: "Device configuration" });
      const power = within(list).getByRole("button", { name: /Power/ });
      expect(power).toHaveAttribute("aria-current", "page");
      expect(
        within(power).getByRole("img", { name: "Unsaved changes" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Device configuration/ }),
      ).not.toHaveAttribute("aria-current");
    });

    it("opens a subitem with its section", () => {
      const onSelectSub = vi.fn();
      render(
        <SettingsNav
          title="Settings"
          groups={withSubitems}
          activeId="user"
          onSelect={vi.fn()}
          onSelectSub={onSelectSub}
          query=""
          onQueryChange={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Power/ }));
      expect(onSelectSub).toHaveBeenCalledWith("device", "power");
    });
  });
});
