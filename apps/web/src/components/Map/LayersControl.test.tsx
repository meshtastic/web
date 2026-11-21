import { defaultVisibilityState } from "@core/nodes/mapLayers.ts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LayersControl } from "./LayersControl.tsx";
import { loadMapTranslations } from "./mapTestI18n.ts";

beforeAll(loadMapTranslations);

describe("LayersControl", () => {
  it("lists every layer as a labelled checkbox in a named group", () => {
    render(
      <LayersControl
        visibility={defaultVisibilityState}
        onToggle={vi.fn()}
        heatmapMode="density"
        onHeatmapModeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("group", { name: "Layers" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Nodes" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Waypoints" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Precision circles" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Neighbor links" }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Heatmap" })).not.toBeChecked();
  });

  it("reports the toggled layer", async () => {
    const onToggle = vi.fn();
    render(
      <LayersControl
        visibility={defaultVisibilityState}
        onToggle={onToggle}
        heatmapMode="density"
        onHeatmapModeChange={vi.fn()}
      />,
    );
    await userEvent
      .setup()
      .click(screen.getByRole("checkbox", { name: "Direct links" }));
    expect(onToggle).toHaveBeenCalledWith("directNeighbors");
  });

  it("offers the heatmap mode only while the heatmap is on", async () => {
    const onMode = vi.fn();
    const { rerender } = render(
      <LayersControl
        visibility={defaultVisibilityState}
        onToggle={vi.fn()}
        heatmapMode="density"
        onHeatmapModeChange={onMode}
      />,
    );
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    rerender(
      <LayersControl
        visibility={{ ...defaultVisibilityState, heatmap: true }}
        onToggle={vi.fn()}
        heatmapMode="density"
        onHeatmapModeChange={onMode}
      />,
    );
    await userEvent.setup().click(screen.getByRole("radio", { name: "SNR" }));
    expect(onMode).toHaveBeenCalledWith("snr");
  });
});
