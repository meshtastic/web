import { useNodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { Protobuf } from "@core/protobuf.ts";
import { makeRow, NOW } from "@core/nodes/testNodes.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { loadMapTranslations } from "./mapTestI18n.ts";
import { SelectedNodeCard } from "./SelectedNodeCard.tsx";

beforeAll(loadMapTranslations);

const node = makeRow({
  num: 2,
  longName: "IB North",
  hwModel: Protobuf.Mesh.HardwareModel.HELTEC_V3,
  hopsAway: 2,
  heardSecondsAgo: 180,
  batteryLevel: 77,
  lat: 1,
  lng: 1,
});

const actions = () => ({
  message: vi.fn(),
  traceroute: vi.fn(),
  openAllDetails: vi.fn(),
});

const Harness = ({
  row,
  act,
  onClose,
}: {
  row: NodeRow;
  act: ReturnType<typeof actions>;
  onClose: () => void;
}) => (
  <SelectedNodeCard
    row={row}
    labels={useNodeLabels(NOW)}
    actions={act}
    onClose={onClose}
  />
);

describe("SelectedNodeCard", () => {
  it("is a region named after the node, with its summary", () => {
    render(<Harness row={node} act={actions()} onClose={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: "IB North" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 hops · heard 3 minutes ago"),
    ).toBeInTheDocument();
    expect(screen.getByText("HELTEC V3 · 77%")).toBeInTheDocument();
  });

  it("messages, traceroutes, opens details and closes", async () => {
    const act = actions();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness row={node} act={act} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Message" }));
    await user.click(screen.getByRole("button", { name: "Traceroute" }));
    await user.click(screen.getByRole("button", { name: "Node details" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(act.message).toHaveBeenCalled();
    expect(act.traceroute).toHaveBeenCalled();
    expect(act.openAllDetails).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("drops Message and Traceroute for this device", () => {
    const me = makeRow(
      { num: 9, longName: "Me", lat: 1, lng: 1 },
      { myNodeNum: 9 },
    );
    render(<Harness row={me} act={actions()} onClose={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Message" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Traceroute" }),
    ).not.toBeInTheDocument();
  });

  it("takes focus at its heading and closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Harness row={node} act={actions()} onClose={onClose} />);
    expect(screen.getByRole("heading", { name: "IB North" })).toHaveFocus();
    await userEvent.setup().keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an altitude of 0 m", () => {
    const atSea = makeRow({
      num: 5,
      longName: "Buoy",
      lat: 1,
      lng: 1,
      altitude: 0,
    });
    render(<Harness row={atSea} act={actions()} onClose={vi.fn()} />);
    expect(screen.getByText(/0 m altitude/u)).toBeInTheDocument();
  });
});
