import { makeRow, NOW } from "@core/nodes/testNodes.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NodeDetailsPanel } from "./NodeDetailsPanel.tsx";
import type { NodeActions } from "./useNodeActions.ts";
import { useNodeLabels } from "./useNodeLabels.ts";

vi.mock("@components/generic/Uptime.tsx", () => ({
  Uptime: ({ seconds }: { seconds: number }) => <span>{seconds}s</span>,
}));

const makeActions = (): NodeActions => ({
  message: vi.fn(),
  showOnMap: vi.fn(),
  traceroute: vi.fn(),
  requestPosition: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleIgnored: vi.fn(),
  verifyKey: vi.fn(),
  remove: vi.fn(),
  openAllDetails: vi.fn(),
});

const Harness = ({
  row,
  actions,
  onBack,
  hasError,
}: {
  row: NodeRow;
  actions: NodeActions;
  onBack?: () => void;
  hasError?: boolean;
}) => (
  <NodeDetailsPanel
    row={row}
    labels={useNodeLabels(NOW)}
    actions={actions}
    onBack={onBack}
    hasError={hasError}
  />
);

const node = makeRow(
  {
    num: 0x0c40,
    longName: "IB North",
    shortName: "IB-N",
    heardSecondsAgo: 180,
    hopsAway: 2,
    snr: -9,
    lat: 37.5,
    lng: -122.25,
    publicKey: new Uint8Array([1, 2, 3]),
    batteryLevel: 80,
  },
  { myNodeNum: 9 },
);

describe("NodeDetailsPanel", () => {
  it("heads the panel with the node and its signal", () => {
    render(<Harness row={node} actions={makeActions()} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "IB North" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 hops · heard 3 minutes ago"),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Signal" })).toHaveTextContent(
      "-9.0 dB",
    );
  });

  it("wires every action", async () => {
    const actions = makeActions();
    const user = userEvent.setup();
    render(<Harness row={node} actions={actions} />);
    const clicks: [string, keyof NodeActions][] = [
      ["Message", "message"],
      ["Show on map", "showOnMap"],
      ["Traceroute", "traceroute"],
      ["Request position", "requestPosition"],
      ["Add to favorites", "toggleFavorite"],
      ["Verify key", "verifyKey"],
      ["Telemetry and raw data", "openAllDetails"],
      ["Ignore node", "toggleIgnored"],
      ["Remove node", "remove"],
    ];
    for (const [name, action] of clicks) {
      await user.click(screen.getByRole("button", { name }));
      expect(actions[action]).toHaveBeenCalledTimes(1);
    }
  });

  it("offers to undo favourite and ignore", () => {
    render(
      <Harness
        row={{ ...node, isFavorite: true, isIgnored: true }}
        actions={makeActions()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Remove from favorites" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stop ignoring node" }),
    ).toBeInTheDocument();
  });

  it("disables Show on map without a position", () => {
    render(
      <Harness row={{ ...node, lngLat: undefined }} actions={makeActions()} />,
    );
    expect(screen.getByRole("button", { name: "Show on map" })).toBeDisabled();
    expect(screen.getByText("No position shared yet.")).toBeInTheDocument();
  });

  it("links the coordinates to OpenStreetMap", () => {
    render(<Harness row={node} actions={makeActions()} />);
    expect(
      screen.getByRole("link", { name: "37.50000, -122.25000" }),
    ).toHaveAttribute("href", expect.stringContaining("openstreetmap.org"));
  });

  it("hides actions that make no sense for this device", () => {
    const me = makeRow(
      { num: 9, longName: "Me", lat: 1, lng: 1 },
      { myNodeNum: 9 },
    );
    render(<Harness row={me} actions={makeActions()} />);
    for (const name of [
      "Message",
      "Traceroute",
      "Ignore node",
      "Remove node",
    ]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: "Telemetry and raw data" }),
    ).toBeInTheDocument();
  });

  it("has a back button on mobile", async () => {
    const onBack = vi.fn();
    render(<Harness row={node} actions={makeActions()} onBack={onBack} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Back to nodes" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("focuses the node's name only where it replaces the list", () => {
    const { unmount } = render(<Harness row={node} actions={makeActions()} />);
    expect(screen.getByRole("heading", { name: "IB North" })).not.toHaveFocus();
    unmount();
    render(<Harness row={node} actions={makeActions()} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "IB North" })).toHaveFocus();
  });

  it("warns when the node reported an error", () => {
    render(<Harness row={node} actions={makeActions()} hasError />);
    expect(
      screen.getByText(/This node reported an error/u),
    ).toBeInTheDocument();
  });
});
