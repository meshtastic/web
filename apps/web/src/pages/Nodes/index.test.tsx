import { makeNode, makeRow, NOW } from "@core/nodes/testNodes.ts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NodesPage from "./index.tsx";

const env = vi.hoisted(() => ({ mobile: false }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@core/hooks/useIsMobile.ts", () => ({
  useIsMobile: () => env.mobile,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string;
  }) => select({ pathname: "/nodes" }),
}));

vi.mock("@components/Shell/MobileHeaderControls.tsx", () => ({
  MobileHeaderControls: () => null,
}));

vi.mock("@components/Nodes/NodeResponseDialogs.tsx", () => ({
  NodeResponseDialogs: () => null,
}));

vi.mock("@core/kmp/hooks", () => ({ useNodeErrors: () => [] }));

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

const specs = [
  {
    num: 1,
    longName: "Alpha Base",
    shortName: "ALPH",
    heardSecondsAgo: 600,
    hopsAway: 0,
    snr: 6,
    isFavorite: true,
  },
  {
    num: 2,
    longName: "Bravo Hill",
    shortName: "BRVO",
    heardSecondsAgo: 60,
    hopsAway: 2,
    snr: -12,
  },
  {
    num: 3,
    longName: "Charlie Relay",
    shortName: "CHRL",
    heardSecondsAgo: 86_400,
    hopsAway: 3,
    lat: 1,
    lng: 1,
  },
];

vi.mock("@components/Nodes/useNodeRows.ts", () => ({
  useNodeRows: () => ({
    rows: specs.map((spec) => makeRow(spec)),
    sources: specs.map((spec) => makeNode(spec)),
    now: NOW,
  }),
}));

const rowNames = () =>
  within(screen.getByRole("table", { name: "Known nodes" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("button")[0]?.textContent);

describe("Nodes page", () => {
  beforeEach(() => {
    env.mobile = false;
    localStorage.clear();
  });

  it("summarises the mesh and lists nodes, most recently heard first", () => {
    render(<NodesPage />);
    expect(
      screen.getByText("3 known · 2 heard in the last 2 h"),
    ).toBeInTheDocument();
    expect(rowNames()).toEqual(["Bravo Hill", "Alpha Base", "Charlie Relay"]);
  });

  it("re-sorts from a column header and flips on a second press", async () => {
    const user = userEvent.setup();
    render(<NodesPage />);
    await user.click(screen.getByRole("button", { name: "Node" }));
    expect(rowNames()).toEqual(["Alpha Base", "Bravo Hill", "Charlie Relay"]);
    await user.click(screen.getByRole("button", { name: "Node" }));
    expect(rowNames()).toEqual(["Charlie Relay", "Bravo Hill", "Alpha Base"]);
  });

  it("filters with chips and search, and offers to clear when nothing matches", async () => {
    const user = userEvent.setup();
    render(<NodesPage />);
    await user.click(screen.getByRole("button", { name: /Favorites/u }));
    expect(rowNames()).toEqual(["Alpha Base"]);
    await user.click(screen.getByRole("button", { name: /Favorites/u }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search nodes" }),
      "chrl",
    );
    expect(rowNames()).toEqual(["Charlie Relay"]);
    await user.click(screen.getByRole("button", { name: /Direct/u }));
    expect(screen.getByText("No nodes match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rowNames()).toHaveLength(3);
  });

  it("opens the selected node in the details column", async () => {
    const user = userEvent.setup();
    render(<NodesPage />);
    expect(
      screen.getByText("Select a node to see its details and actions."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bravo Hill" }));
    const details = screen.getByRole("complementary", { name: "Node details" });
    expect(
      within(details).getByRole("heading", { name: "Bravo Hill" }),
    ).toBeInTheDocument();
  });

  it("reopens a hidden details column when a node is picked", async () => {
    localStorage.setItem("meshtastic:detailsPanelOpen", "false");
    const user = userEvent.setup();
    render(<NodesPage />);
    expect(
      screen.queryByRole("complementary", { name: "Node details" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Alpha Base" }));
    expect(
      screen.getByRole("complementary", { name: "Node details" }),
    ).toBeInTheDocument();
  });

  it("messages a node from its row", async () => {
    const user = userEvent.setup();
    render(<NodesPage />);
    await user.click(
      screen.getByRole("button", { name: "Message Bravo Hill" }),
    );
    expect(navigate).toHaveBeenCalledWith({
      to: "/messages/$type/$chatId",
      params: { type: "direct", chatId: 2 },
    });
  });

  it("swaps the list for the details on mobile, with a way back", async () => {
    env.mobile = true;
    const user = userEvent.setup();
    render(<NodesPage />);
    await user.click(screen.getByRole("button", { name: /Bravo Hill/u }));
    // The details replace the list, so focus starts at the node's name.
    expect(
      screen.getByRole("heading", { level: 2, name: "Bravo Hill" }),
    ).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Back to nodes" }));
    expect(
      screen.getByRole("list", { name: "Known nodes" }),
    ).toBeInTheDocument();
    // Back returns focus to the row the user came from.
    expect(screen.getByRole("button", { name: /Bravo Hill/u })).toHaveFocus();
  });

  it("leaves focus in the table when a row is picked on desktop", async () => {
    const user = userEvent.setup();
    render(<NodesPage />);
    const row = screen.getByRole("button", { name: "Bravo Hill" });
    await user.click(row);
    expect(row).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Details for Bravo Hill shown in the side panel",
    );
  });
});
