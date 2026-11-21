import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useEffect } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMapTranslations } from "./mapTestI18n.ts";
import { MeshMap } from "./MeshMap.tsx";

beforeAll(loadMapTranslations);

interface FakeMapProps {
  children?: ReactNode;
  onError?: (event: { target: unknown; error: Error }) => void;
}

// What react-map-gl reports, set per test: a failed `import("maplibre-gl")`
// arrives with no map (target null); tile errors come from a live map.
const failure = vi.hoisted(() => {
  const state: { target: unknown } = { target: undefined };
  return state;
});

vi.mock("react-map-gl/maplibre", () => ({
  default: ({ children, onError }: FakeMapProps) => {
    useEffect(() => {
      if (failure.target !== undefined) {
        onError?.({ target: failure.target, error: new Error("boom") });
      }
    }, [onError]);
    return <div data-testid="map">{children}</div>;
  },
  AttributionControl: () => null,
  ScaleControl: () => null,
}));

describe("MeshMap", () => {
  beforeEach(() => {
    failure.target = undefined;
  });

  it("renders the map when it loads", () => {
    render(<MeshMap />);
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers a reload when the map code fails to load", async () => {
    failure.target = null;
    const onReload = vi.fn();
    render(<MeshMap onReload={onReload} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The map couldn't load");
    expect(screen.queryByTestId("map")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it("keeps the map on tile and style errors", () => {
    failure.target = { loaded: () => true };
    render(<MeshMap />);
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
