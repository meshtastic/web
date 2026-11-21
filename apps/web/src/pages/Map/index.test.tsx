import { loadMapTranslations } from "@components/Map/mapTestI18n.ts";
import { makeNode, makeRow, NOW } from "@core/nodes/testNodes.ts";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import MapPage from "./index.tsx";

beforeAll(loadMapTranslations);

const env = vi.hoisted(() => {
  const params: Record<string, string> = {};
  return { mobile: false, params };
});

const mapRef = vi.hoisted(() => ({
  easeTo: vi.fn(),
  jumpTo: vi.fn(),
  getZoom: () => 10,
  cameraForBounds: vi.fn(),
  getCanvas: () => document.body,
  getMap: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn() }),
}));

// A DOM stand-in for maplibre: markers render their children in place and
// report clicks the way react-map-gl does.
vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  AttributionControl: () => null,
  ScaleControl: () => null,
  Source: () => null,
  Layer: () => null,
  useMap: () => ({ default: mapRef }),
  Marker: ({
    children,
    onClick,
  }: {
    children?: ReactNode;
    onClick?: (event: { originalEvent: MouseEvent }) => void;
  }) => (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stands in for maplibre's marker element
    <div onClick={(event) => onClick?.({ originalEvent: event.nativeEvent })}>
      {children}
    </div>
  ),
}));

vi.mock("@core/hooks/useIsMobile.ts", () => ({
  useIsMobile: () => env.mobile,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
  useParams: () => env.params,
  useNavigate: () => vi.fn(),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/map" }),
}));

vi.mock("@components/Shell/MobileHeaderControls.tsx", () => ({
  MobileHeaderControls: () => null,
}));
vi.mock("@components/Nodes/NodeResponseDialogs.tsx", () => ({
  NodeResponseDialogs: () => null,
}));
vi.mock("@components/PageComponents/Map/Layers/WaypointLayer.tsx", () => ({
  WaypointLayer: () => null,
}));
// Neighbour links read the device store; they draw nothing here anyway.
vi.mock("@components/PageComponents/Map/Layers/SNRLayer.tsx", () => ({
  SNRLayer: () => null,
  SNRTooltip: () => null,
}));
vi.mock("@components/Nodes/useNodeActions.ts", () => ({
  useNodeActions: () => ({
    message: vi.fn(),
    showOnMap: vi.fn(),
    traceroute: vi.fn(),
    requestPosition: vi.fn(),
    toggleFavorite: vi.fn(),
    toggleIgnored: vi.fn(),
    verifyKey: vi.fn(),
    remove: vi.fn(),
    openAllDetails: vi.fn(),
  }),
}));

// Alpha and Bravo share a point, so they stack; Charlie stands alone.
const specs = [
  { num: 1, longName: "Alpha Base", heardSecondsAgo: 60, lat: 10, lng: 20 },
  { num: 2, longName: "Bravo Hill", heardSecondsAgo: 120, lat: 10, lng: 20 },
  { num: 3, longName: "Charlie Relay", heardSecondsAgo: 180, lat: 11, lng: 21 },
];

vi.mock("@components/Nodes/useNodeRows.ts", () => ({
  useNodeRows: () => ({
    rows: specs.map((spec) => makeRow(spec)),
    sources: specs.map((spec) => makeNode(spec)),
    now: NOW,
  }),
}));

const pin = (name: string) =>
  within(screen.getByTestId("map")).getByRole("button", { name });
const card = (name: string) => screen.queryByRole("region", { name });

describe("Map page", () => {
  beforeEach(() => {
    env.mobile = false;
    env.params = {};
    localStorage.clear();
    mapRef.easeTo.mockClear();
  });

  it("opens a node's card from its pin and closes it with Escape", async () => {
    const user = userEvent.setup();
    render(<MapPage />);
    await user.click(pin("Charlie Relay"));
    expect(pin("Charlie Relay")).toHaveAttribute("aria-pressed", "true");
    expect(card("Charlie Relay")).toBeInTheDocument();
    // The card's heading takes focus, so Escape reaches it.
    expect(
      within(card("Charlie Relay") ?? document.body).getByRole("heading"),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(card("Charlie Relay")).not.toBeInTheDocument();
    // Focus goes back to the node in the list.
    const list = screen.getByRole("list", { name: "Nodes on map" });
    await waitFor(() =>
      expect(
        within(list).getByRole("button", { name: /Charlie Relay/u }),
      ).toHaveFocus(),
    );
  });

  it("closes the card from its close button", async () => {
    const user = userEvent.setup();
    render(<MapPage />);
    await user.click(pin("Charlie Relay"));
    await user.click(
      within(card("Charlie Relay") ?? document.body).getByRole("button", {
        name: "Close",
      }),
    );
    expect(card("Charlie Relay")).not.toBeInTheDocument();
  });

  it("expands a stack of nodes at one point", async () => {
    const user = userEvent.setup();
    render(<MapPage />);
    const map = within(screen.getByTestId("map"));
    expect(map.queryByRole("button", { name: "Bravo Hill" })).toBeNull();
    await user.click(
      map.getByRole("button", { name: "Show 1 more node here" }),
    );
    expect(pin("Alpha Base")).toBeInTheDocument();
    expect(pin("Bravo Hill")).toBeInTheDocument();
  });

  it("keeps pins out of the tab order, after the overlays", () => {
    render(<MapPage />);
    expect(pin("Charlie Relay")).toHaveAttribute("tabindex", "-1");
    const list = screen.getByRole("list", { name: "Nodes on map" });
    expect(
      list.compareDocumentPosition(screen.getByTestId("map")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("fades pins that don't match the list search", async () => {
    const user = userEvent.setup();
    render(<MapPage />);
    await user.type(screen.getByRole("searchbox"), "charlie");
    await waitFor(() => expect(pin("Alpha Base")).toHaveClass("opacity-40"));
    expect(pin("Charlie Relay")).not.toHaveClass("opacity-40");
  });

  it("selects a link's target node, and follows a new link", () => {
    env.params = { long: "21", lat: "11", zoom: "14" };
    const { rerender } = render(<MapPage />);
    expect(card("Charlie Relay")).toBeInTheDocument();
    expect(mapRef.easeTo).not.toHaveBeenCalled();

    env.params = { long: "20", lat: "10", zoom: "12" };
    act(() => rerender(<MapPage />));
    expect(card("Alpha Base")).toBeInTheDocument();
    expect(card("Charlie Relay")).not.toBeInTheDocument();
    expect(mapRef.easeTo).toHaveBeenCalledWith({
      center: [20, 10],
      zoom: 12,
    });
  });
});
