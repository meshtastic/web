import { Badge } from "@components/UI/Badge.tsx";
import { Breadcrumb } from "@components/UI/Breadcrumb.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@components/UI/Card.tsx";
import { CopyField } from "@components/UI/CopyField.tsx";
import { CountBadge } from "@components/UI/CountBadge.tsx";
import { DangerZoneCard } from "@components/UI/DangerZoneCard.tsx";
import { Divider } from "@components/UI/Divider.tsx";
import { EmptyState } from "@components/UI/EmptyState.tsx";
import { FilterChip } from "@components/UI/FilterChip.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { Kbd } from "@components/UI/Kbd.tsx";
import { KeyValue, KeyValueList } from "@components/UI/KeyValue.tsx";
import { ListRow } from "@components/UI/ListRow.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { ProgressBar } from "@components/UI/ProgressBar.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import { SearchTrigger } from "@components/UI/SearchTrigger.tsx";
import { SectionHeader } from "@components/UI/SectionHeader.tsx";
import { Skeleton } from "@components/UI/Skeleton.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { StepDots } from "@components/UI/StepDots.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { SettingsIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

describe("Button", () => {
  it("is a non-submitting button that respects disabled", () => {
    const onClick = vi.fn();
    render(
      <form onSubmit={(e) => e.preventDefault()}>
        <Button variant="destructive" onClick={onClick}>
          Old
        </Button>
        <Button variant="danger" disabled onClick={onClick}>
          New
        </Button>
      </form>,
    );
    const old = screen.getByRole("button", { name: "Old" });
    expect(old.getAttribute("type")).toBe("button");
    fireEvent.click(old);
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps link buttons box-free whatever the size", () => {
    render(
      <Button variant="link" size="lg">
        Learn more
      </Button>,
    );
    const classes = screen
      .getByRole("button", { name: "Learn more" })
      .className.split(" ");
    expect(classes).toContain("h-auto");
    expect(classes).toContain("px-0");
    expect(classes).not.toContain("h-11");
    expect(classes).not.toContain("px-6");
  });

  it("renders a decorative icon next to the label", () => {
    render(
      <Button icon={<SettingsIcon data-testid="icon" />}>Settings</Button>,
    );
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
    expect(screen.getByTestId("icon")).toBeTruthy();
  });
});

describe("IconButton", () => {
  it("is named by aria-label, hides the icon and reports aria-current", () => {
    const onClick = vi.fn();
    render(
      <IconButton
        aria-label="Settings"
        size="rail"
        variant="rail"
        aria-current="page"
        icon={<SettingsIcon data-testid="icon" />}
        onClick={onClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Settings" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-current")).toBe("page");
    expect(
      screen.getByTestId("icon").closest("[aria-hidden='true']"),
    ).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("announces a count through its description", () => {
    render(
      <IconButton
        aria-label="Messages"
        aria-describedby="extra"
        icon={<SettingsIcon />}
        count={4}
      />,
    );
    const button = screen.getByRole("button", { name: "Messages" });
    const [extra, countId] = (
      button.getAttribute("aria-describedby") ?? ""
    ).split(" ");
    expect(extra).toBe("extra");
    expect(document.getElementById(countId ?? "")?.textContent).toBe(
      "4 unread messages",
    );
    expect(button.textContent).toContain("4");
  });

  it("adds no description without a count", () => {
    render(<IconButton aria-label="Map" icon={<SettingsIcon />} count={0} />);
    expect(
      screen
        .getByRole("button", { name: "Map" })
        .hasAttribute("aria-describedby"),
    ).toBe(false);
  });
});

describe("Kbd and search", () => {
  it("renders a shortcut hint", () => {
    render(<Kbd>⌘K</Kbd>);
    expect(screen.getByText("⌘K").tagName).toBe("KBD");
  });

  it("SearchField is a labelled search box", () => {
    render(<SearchField label="Search settings" shortcut="/" />);
    const box = screen.getByRole("searchbox", { name: "Search settings" });
    expect(box.getAttribute("placeholder")).toBe("Search settings");
  });

  it("SearchTrigger announces its shortcut", () => {
    render(<SearchTrigger label="Search chats" shortcut="⌘K" />);
    expect(screen.getByRole("button").textContent).toContain(
      "Keyboard shortcut: ⌘K",
    );
  });
});

describe("FilterChip", () => {
  it("reports its pressed state", () => {
    render(
      <>
        <FilterChip selected>All</FilterChip>
        <FilterChip selected={false} count={3}>
          Unread
        </FilterChip>
      </>,
    );
    expect(
      screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /Unread/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});

describe("badges and dots", () => {
  it("Badge renders its content and passes attributes through", () => {
    render(
      <Badge variant="warning" title="Administrator">
        Admin
      </Badge>,
    );
    expect(screen.getByTitle("Administrator").textContent).toBe("Admin");
  });

  it("CountBadge pluralises its label, caps, and hides at zero", () => {
    const { rerender, container } = render(<CountBadge count={1} />);
    expect(screen.getByText("1 unread message")).toBeTruthy();
    rerender(<CountBadge count={150} />);
    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByText("150 unread messages")).toBeTruthy();
    rerender(<CountBadge count={0} />);
    expect(container.textContent).toBe("");
  });

  it("StatusDot has a default label and can be decorative", () => {
    render(
      <>
        <StatusDot status="online" />
        <StatusDot status="offline" label={null} data-testid="quiet" />
      </>,
    );
    expect(screen.getByRole("img", { name: "Online" })).toBeTruthy();
    expect(screen.getByTestId("quiet").getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("NodeAvatar", () => {
  it("fills node avatars with the node colour via a custom property", () => {
    render(
      <NodeAvatar
        initials="0c40"
        tone={{ kind: "node", nodeNum: 0x00ff8000 }}
        label="COULLS_BASE"
        presence="online"
      />,
    );
    const avatar = screen.getByRole("img", { name: "COULLS_BASE" });
    expect(avatar.style.getPropertyValue("--avatar-bg")).toBe(
      "rgb(255, 128, 0)",
    );
    // No inline background, so a caller's bg-* class can win.
    expect(avatar.style.backgroundColor).toBe("");
    expect(avatar.textContent).toContain("0c40");
  });

  it("lets a caller's classes override fill and ink", () => {
    render(
      <NodeAvatar
        initials="WP"
        tone={{ kind: "node", nodeNum: 0x123456 }}
        label="Waypoint"
        className="bg-amber-400 text-red-500"
      />,
    );
    const classes = screen
      .getByRole("img", { name: "Waypoint" })
      .className.split(" ");
    expect(classes).toContain("bg-amber-400");
    expect(classes).not.toContain("bg-(--avatar-bg)");
    expect(classes).toContain("text-red-500");
    expect(classes.some((c) => c.startsWith("text-avatar-ink"))).toBe(false);
  });

  it("is hidden from assistive tech without a label", () => {
    const { container } = render(
      <NodeAvatar initials="EAO1" tone={{ kind: "device" }} shape="rounded" />,
    );
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("layout primitives", () => {
  it("Card and DangerZoneCard", () => {
    render(
      <>
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent>Body</CardContent>
        </Card>
        <DangerZoneCard title="Danger zone">
          <div>Reset</div>
        </DangerZoneCard>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Identity" })).toBeTruthy();
    const danger = screen.getByRole("heading", { name: "Danger zone" });
    expect(danger.parentElement?.nextElementSibling?.textContent).toBe("Reset");
  });

  it("SectionHeader renders a heading with an action", () => {
    render(
      <SectionHeader
        title="Channels"
        action={<button type="button">Add</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Channels" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add" })).toBeTruthy();
  });

  it("ListRow marks the selected row", () => {
    render(
      <ListRow
        title="Primary"
        meta="9:40"
        description="Anyone up for a range test?"
        trailing={<CountBadge count={3} label={null} />}
        selected
      />,
    );
    const row = screen.getByRole("button", { name: /Primary/ });
    expect(row.getAttribute("aria-current")).toBe("true");
    expect(row.textContent).toContain("Anyone up for a range test?");
  });

  it("Divider with and without a label", () => {
    const { container } = render(
      <>
        <Divider />
        <Divider label="Today" />
      </>,
    );
    expect(screen.getByText("Today")).toBeTruthy();
    expect(container.querySelectorAll("[data-orientation]").length).toBe(1);
  });

  it("EmptyState", () => {
    render(
      <EmptyState title="Pick a chat to start" description="Choose one.">
        <button type="button">New message</button>
      </EmptyState>,
    );
    expect(
      screen.getByRole("heading", { name: "Pick a chat to start" }),
    ).toBeTruthy();
  });

  it("Callout tones", () => {
    render(
      <Callout tone="warning" title="Region not set" data-testid="callout">
        The radio will not transmit.
      </Callout>,
    );
    const callout = screen.getByTestId("callout");
    expect(callout.textContent).toContain("Region not set");
    expect(callout.textContent).toContain("The radio will not transmit.");
    // The tone icon is decorative.
    expect(
      callout.querySelector("svg")?.closest("[aria-hidden]"),
    ).not.toBeNull();
  });

  it("KeyValue rows and tiles", () => {
    render(
      <KeyValueList>
        <KeyValue label="Hardware" value="HELTEC_V4" />
        <KeyValue variant="tile" label="SNR" value="−9 dB" />
      </KeyValueList>,
    );
    expect(screen.getByText("Hardware").tagName).toBe("DT");
    expect(screen.getByText("−9 dB").tagName).toBe("DD");
  });

  it("Breadcrumb marks the current page", () => {
    render(<Breadcrumb items={["Configuration", "EAO1"]} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const items = nav.querySelectorAll("li");
    expect(items).toHaveLength(2);
    expect(items[1]?.getAttribute("aria-current")).toBe("page");
  });

  it("StepDots and ProgressBar", () => {
    const { container } = render(
      <>
        <StepDots current={2} total={5} stepName="Connect" />
        <ProgressBar value={62.4} label="Syncing" />
      </>,
    );
    expect(screen.getByText("Step 2 of 5 · Connect")).toBeTruthy();
    const states = Array.from(container.querySelectorAll("[data-state]")).map(
      (dot) => dot.getAttribute("data-state"),
    );
    expect(states).toEqual(["done", "current", "todo", "todo", "todo"]);
    expect(
      screen
        .getByRole("progressbar", { name: "Syncing" })
        .getAttribute("value"),
    ).toBe("62");
  });

  it("Skeleton passes attributes and Switch toggles", () => {
    render(
      <>
        <Skeleton data-testid="skeleton" aria-busy="true" />
        <Switch aria-label="Sounds" defaultChecked />
      </>,
    );
    expect(screen.getByTestId("skeleton").getAttribute("aria-busy")).toBe(
      "true",
    );
    const toggle = screen.getByRole("switch", { name: "Sounds" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });
});

describe("CopyField", () => {
  it("copies the value", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CopyField label="Public key" value="base64key=" />);
    expect(
      screen.getByRole("group", { name: "Public key" }).textContent,
    ).toContain("base64key=");
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy to clipboard" }),
      );
    });
    expect(writeText).toHaveBeenCalledWith("base64key=");
    expect(screen.getByRole("button", { name: "Copied!" })).toBeTruthy();
  });
});
