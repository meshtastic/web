import { act, fireEvent, render, screen } from "@testing-library/react";
import { SaveIcon } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DETAILS_PANEL_STORAGE_KEY, ShellPage } from "./ShellPage.tsx";

const viewport = vi.hoisted(() => ({
  mobile: false,
  wide: true,
  listeners: new Set<() => void>(),
}));

const route = vi.hoisted(() => ({
  pathname: "/messages/broadcast/0",
  fullScreen: false,
}));

vi.mock("@core/hooks/useIsMobile.ts", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (onChange: () => void) => {
    viewport.listeners.add(onChange);
    return () => {
      viewport.listeners.delete(onChange);
    };
  };
  return {
    useCanFitDetailsColumn: () =>
      useSyncExternalStore(subscribe, () => viewport.wide),
    useIsMobile: () =>
      useSyncExternalStore(
        (onChange: () => void) => {
          viewport.listeners.add(onChange);
          return () => {
            viewport.listeners.delete(onChange);
          };
        },
        () => viewport.mobile,
      ),
  };
});

vi.mock("@tanstack/react-router", () => ({
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: route.pathname }),
  useMatches: ({
    select,
  }: {
    select: (matches: { staticData?: { hideTabBar?: boolean } }[]) => boolean;
  }) => select([{ staticData: { hideTabBar: route.fullScreen } }]),
}));

vi.mock("./MobileHeaderControls.tsx", () => ({
  MobileHeaderControls: () => <div>mobile header controls</div>,
}));

/** Pin the viewport the `useIsMobile` hook reports. */
function setViewport(isMobile: boolean) {
  viewport.mobile = isMobile;
}

/** Cross the breakpoint the way a window resize would. */
function resizeTo(isMobile: boolean) {
  viewport.mobile = isMobile;
  act(() => {
    for (const listener of [...viewport.listeners]) listener();
  });
}

const page = () => (
  <ShellPage
    label="Conversation"
    sidebar={<div>sidebar content</div>}
    sidebarLabel="Navigation"
    sidebarFooter={<div>device card</div>}
    details={<div>details content</div>}
    detailsLabel="Node details"
    actions={[
      { key: "save", icon: SaveIcon, label: "Save", onClick: () => {} },
    ]}
  >
    <div>page content</div>
  </ShellPage>
);

function renderPage() {
  return render(page());
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  viewport.listeners.clear();
  setViewport(false);
  viewport.wide = true;
  route.pathname = "/messages/broadcast/0";
  route.fullScreen = false;
});

describe("ShellPage", () => {
  describe("desktop", () => {
    it("leaves focus alone", () => {
      setViewport(false);
      renderPage();

      expect(document.activeElement).toBe(document.body);
    });

    it("renders the sidebar, its pinned footer and the details panel as columns", () => {
      setViewport(false);
      renderPage();

      expect(
        screen.getByRole("complementary", { name: "Navigation" }),
      ).toHaveTextContent("sidebar contentdevice card");
      expect(
        screen.getByRole("complementary", { name: "Node details" }),
      ).toHaveTextContent("details content");
      expect(screen.getByText("page content")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Navigation" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("mobile header controls"),
      ).not.toBeInTheDocument();
    });

    it("toggles the details panel and remembers the choice", () => {
      setViewport(false);
      const { unmount } = renderPage();

      const toggle = screen.getByRole("button", { name: "Node details" });
      expect(toggle).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByText("details content")).not.toBeInTheDocument();
      expect(localStorage.getItem(DETAILS_PANEL_STORAGE_KEY)).toBe("false");

      unmount();
      renderPage();
      expect(screen.queryByText("details content")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Node details" }),
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("has no side columns or details toggle when the page supplies none", () => {
      setViewport(false);
      render(
        <ShellPage label="Nodes">
          <div>page content</div>
        </ShellPage>,
      );

      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(screen.queryAllByRole("button")).toHaveLength(0);
    });
  });

  describe("tablet", () => {
    it("keeps the sidebar as a column but opens the details panel as a drawer", () => {
      setViewport(false);
      viewport.wide = false;
      renderPage();

      expect(
        screen.getByRole("complementary", { name: "Navigation" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("details content")).not.toBeInTheDocument();
      expect(
        screen.queryByText("mobile header controls"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Node details" }));
      expect(screen.getByRole("dialog")).toHaveTextContent("details content");
    });

    it("gives the details column back once the viewport is wide enough", () => {
      setViewport(false);
      viewport.wide = false;
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Node details" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      viewport.wide = true;
      act(() => {
        for (const listener of [...viewport.listeners]) listener();
      });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("complementary", { name: "Node details" }),
      ).toHaveTextContent("details content");
    });
  });

  describe("details drawer request", () => {
    const withRequest = (request: number) => (
      <ShellPage
        label="Nodes"
        details={<div>details content</div>}
        detailsLabel="Node details"
        detailsDrawerRequest={request}
      >
        <div>page content</div>
      </ShellPage>
    );

    it("opens the drawer on a tablet each time the request changes", () => {
      setViewport(false);
      viewport.wide = false;
      const { rerender } = render(withRequest(0));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(withRequest(1));
      expect(screen.getByRole("dialog")).toHaveTextContent("details content");

      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(withRequest(2));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("leaves the column to the remembered toggle on a wide screen", () => {
      setViewport(false);
      const { rerender } = render(withRequest(0));
      rerender(withRequest(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.getByRole("complementary", { name: "Node details" }),
      ).toBeInTheDocument();
    });
  });

  describe("mobile", () => {
    it("leaves the footer out of the page and pads the header for the notch", () => {
      setViewport(true);
      renderPage();

      expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
      expect(screen.getByRole("banner").className).toContain(
        "env(safe-area-inset-top)",
      );
    });

    it("keeps a full-screen sub-page header to its own controls", () => {
      setViewport(true);
      route.fullScreen = true;
      renderPage();

      expect(
        screen.queryByText("mobile header controls"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Node details" }),
      ).toBeInTheDocument();
    });

    it("pads drawers clear of the safe-area insets", () => {
      setViewport(true);
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByRole("dialog").className).toContain(
        "env(safe-area-inset-bottom)",
      );
    });

    it("keeps the side panels out of the page and reaches them from the header", () => {
      setViewport(true);
      renderPage();

      expect(screen.getByText("page content")).toBeInTheDocument();
      expect(screen.getByText("mobile header controls")).toBeInTheDocument();
      expect(screen.queryByText("sidebar content")).not.toBeInTheDocument();
      expect(screen.queryByText("details content")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByText("sidebar content")).toBeInTheDocument();
      expect(screen.getByText("device card")).toBeInTheDocument();
    });

    it("opens the details drawer independently", () => {
      setViewport(true);
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Node details" }));
      expect(screen.getByText("details content")).toBeInTheDocument();
      expect(screen.queryByText("sidebar content")).not.toBeInTheDocument();
    });

    it("closes an open drawer once navigation changes the route", () => {
      setViewport(true);
      const { rerender } = renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByText("sidebar content")).toBeInTheDocument();

      route.pathname = "/messages/direct/42";
      rerender(
        <ShellPage
          label="Conversation"
          sidebar={<div>sidebar content</div>}
          sidebarLabel="Navigation"
        >
          <div>page content</div>
        </ShellPage>,
      );

      expect(screen.queryByText("sidebar content")).not.toBeInTheDocument();
    });

    it("gives the panels back as columns when the viewport grows, and keeps no drawer open on the way back", () => {
      setViewport(true);
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByText("sidebar content")).toBeInTheDocument();

      resizeTo(false);
      expect(
        screen.queryByRole("button", { name: "Navigation" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("sidebar content")).toBeInTheDocument();
      expect(screen.getByText("details content")).toBeInTheDocument();

      resizeTo(true);
      expect(screen.queryByText("sidebar content")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Navigation" }),
      ).toBeInTheDocument();
    });

    it("leaves a focused control alone when the viewport crosses into mobile", () => {
      setViewport(false);
      renderPage();

      const save = screen.getByRole("button", { name: "Save" });
      save.focus();

      resizeTo(true);

      expect(document.activeElement).toBe(save);
    });

    it("keeps focus reachable when the breakpoint takes the drawer away", () => {
      setViewport(true);
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      const closeBtn = screen.getByRole("button", { name: "Close" });
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);

      resizeTo(false);

      expect(document.activeElement).toBe(screen.getByRole("main"));
    });

    it("moves focus into the page the drawer navigated to", () => {
      setViewport(true);
      const { unmount } = renderPage();
      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // The route the drawer belongs to unmounts, taking its trigger with it.
      unmount();
      route.pathname = "/nodes";
      renderPage();

      expect(document.activeElement).toBe(screen.getByRole("main"));
    });

    it("names an icon action by its label once the label is hidden", () => {
      setViewport(true);
      renderPage();

      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("does not render a drawer trigger for a panel the page does not supply", () => {
      setViewport(true);
      render(
        <ShellPage
          label="Settings"
          sidebar={<div>sidebar content</div>}
          sidebarLabel="Navigation"
        >
          <div>page content</div>
        </ShellPage>,
      );

      expect(
        screen.getByRole("button", { name: "Navigation" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Details" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps a hidden label for assistive tech and renders the header slots", () => {
    setViewport(true);
    render(
      <ShellPage
        label="LoRa"
        hideLabel
        leading={<button type="button">Back to settings</button>}
        trailing={<button type="button">Save</button>}
      >
        <div>page content</div>
      </ShellPage>,
    );
    expect(screen.getByText("LoRa")).toHaveClass("sr-only");
    expect(
      screen.getByRole("button", { name: "Back to settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
