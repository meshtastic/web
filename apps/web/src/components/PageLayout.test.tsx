import { act, fireEvent, render, screen } from "@testing-library/react";
import { SaveIcon } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageLayout } from "./PageLayout.tsx";

let pathname = "/messages/broadcast/0";

vi.mock("@tanstack/react-router", () => ({
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname }),
}));

const realMatchMedia = globalThis.matchMedia;
let listeners: Array<() => void> = [];
let mobile = false;

/** Pin the viewport the `useIsMobile` media query reports. */
function setViewport(isMobile: boolean) {
  mobile = isMobile;
  globalThis.matchMedia = ((query: string) => ({
    get matches() {
      return mobile;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_: string, cb: () => void) => {
      listeners = listeners.filter((l) => l !== cb);
    },
  })) as unknown as typeof globalThis.matchMedia;
}

/** Cross the breakpoint the way a window resize would. */
function resizeTo(isMobile: boolean) {
  mobile = isMobile;
  act(() => {
    for (const l of [...listeners]) l();
  });
}

const page = () => (
  <PageLayout
    label="Conversation"
    leftBar={<div>left bar content</div>}
    rightBar={<div>right bar content</div>}
    actions={[
      { key: "save", icon: SaveIcon, label: "Save", onClick: () => {} },
    ]}
  >
    <div>page content</div>
  </PageLayout>
);

function renderPage() {
  return render(page());
}

afterEach(() => {
  globalThis.matchMedia = realMatchMedia;
  listeners = [];
  pathname = "/messages/broadcast/0";
});

describe("PageLayout", () => {
  describe("desktop", () => {
    it("leaves focus alone", () => {
      setViewport(false);
      renderPage();

      expect(document.activeElement).toBe(document.body);
    });

    it("renders both side bars as columns, with no drawer triggers", () => {
      setViewport(false);
      renderPage();

      expect(screen.getByText("left bar content")).toBeInTheDocument();
      expect(screen.getByText("right bar content")).toBeInTheDocument();
      expect(screen.getByText("page content")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Navigation" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Nodes" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("mobile", () => {
    it("keeps the side bars out of the page and reaches them from the header", () => {
      setViewport(true);
      renderPage();

      expect(screen.getByText("page content")).toBeInTheDocument();
      expect(screen.queryByText("left bar content")).not.toBeInTheDocument();
      expect(screen.queryByText("right bar content")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByText("left bar content")).toBeInTheDocument();
    });

    it("opens the secondary panel independently", () => {
      setViewport(true);
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Nodes" }));
      expect(screen.getByText("right bar content")).toBeInTheDocument();
      expect(screen.queryByText("left bar content")).not.toBeInTheDocument();
    });

    it("closes an open drawer once navigation changes the route", () => {
      setViewport(true);
      const { rerender } = renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByText("left bar content")).toBeInTheDocument();

      pathname = "/messages/direct/42";
      rerender(
        <PageLayout label="Conversation" leftBar={<div>left bar content</div>}>
          <div>page content</div>
        </PageLayout>,
      );

      expect(screen.queryByText("left bar content")).not.toBeInTheDocument();
    });

    it("gives the bars back as columns when the viewport grows, and keeps no drawer open on the way back", () => {
      setViewport(true);
      renderPage();

      fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
      expect(screen.getByText("left bar content")).toBeInTheDocument();

      resizeTo(false);
      expect(
        screen.queryByRole("button", { name: "Navigation" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("left bar content")).toBeInTheDocument();
      expect(screen.getByText("right bar content")).toBeInTheDocument();

      resizeTo(true);
      expect(screen.queryByText("left bar content")).not.toBeInTheDocument();
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
      pathname = "/nodes";
      renderPage();

      expect(document.activeElement).toBe(screen.getByRole("main"));
    });

    it("names an icon action by its label once the label is hidden", () => {
      setViewport(true);
      renderPage();

      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("does not render a drawer trigger for a bar the page does not supply", () => {
      setViewport(true);
      render(
        <PageLayout label="Nodes" leftBar={<div>left bar content</div>}>
          <div>page content</div>
        </PageLayout>,
      );

      expect(
        screen.getByRole("button", { name: "Navigation" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Nodes" }),
      ).not.toBeInTheDocument();
    });
  });
});
