import { create } from "@bufbuild/protobuf";
import type { WaypointWithMetadata } from "@core/stores";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Protobuf } from "@meshtastic/sdk";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaypointEditDialog } from "./WaypointEditDialog.tsx";

const mockToast = vi.fn();
vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const sendWaypoint = vi.fn().mockResolvedValue(0);
const addWaypoint = vi.fn();
vi.mock("@core/stores", () => ({
  useDevice: () => ({
    hardware: { myNodeNum: 1 },
    connection: { sendWaypoint },
    addWaypoint,
    // Metric device — matches the presets asserted below.
    config: { display: { units: 0 } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}));

vi.mock("@components/UI/Dialog.tsx", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogClose: () => null,
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@components/UI/Button.tsx", () => ({
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

vi.mock("@components/UI/Input.tsx", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@components/UI/Label.tsx", () => ({
  Label: ({ children, ...rest }: { children: ReactNode }) => (
    <label {...rest}>{children}</label>
  ),
}));

vi.mock("@components/UI/Switch.tsx", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    id?: string;
  }) => (
    <input
      type="checkbox"
      role="switch"
      id={id}
      data-testid={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

function makeWaypoint(
  fields: Record<string, unknown> = {},
): WaypointWithMetadata {
  const wp = create(Protobuf.Mesh.WaypointSchema, fields as never);
  return Object.assign(wp, {
    metadata: { channel: 0, created: new Date(), from: 1 },
  });
}

describe("WaypointEditDialog – geofence controls (design#114 compliance)", () => {
  beforeEach(() => {
    mockToast.mockClear();
    sendWaypoint.mockClear();
    addWaypoint.mockClear();
  });

  it("hides notify toggles until a radius or box is set", () => {
    render(
      <WaypointEditDialog
        open
        onOpenChange={() => {}}
        waypoint={makeWaypoint({ id: 1, name: "Home" })}
        initialLngLat={undefined}
        channel={0}
        mapRef={undefined}
        onRequestBoundingBoxDraw={async () => undefined}
      />,
    );
    expect(screen.queryByTestId("wp-notify-enter")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wp-notify-exit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wp-notify-fav")).not.toBeInTheDocument();
  });

  it("reveals enter/exit toggles once a radius preset is selected; favorites-only revealed once enter is on", () => {
    render(
      <WaypointEditDialog
        open
        onOpenChange={() => {}}
        waypoint={makeWaypoint({ id: 1, name: "Home" })}
        initialLngLat={undefined}
        channel={0}
        mapRef={undefined}
        onRequestBoundingBoxDraw={async () => undefined}
      />,
    );
    // Metric locale (en-GB) → "500 meters"
    const preset500 = screen.getByRole("button", {
      name: /500 unit\.meter\.plural/i,
    });
    act(() => {
      fireEvent.click(preset500);
    });

    expect(screen.getByTestId("wp-notify-enter")).toBeInTheDocument();
    expect(screen.getByTestId("wp-notify-exit")).toBeInTheDocument();
    // Favorites-only stays hidden until enter or exit is on
    expect(screen.queryByTestId("wp-notify-fav")).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId("wp-notify-enter"));
    });
    expect(screen.getByTestId("wp-notify-fav")).toBeInTheDocument();
  });

  it("draws box via the callback and shows Edit/Remove buttons afterwards", async () => {
    const drawFn = vi.fn().mockResolvedValue({
      west: -74.1,
      south: 39.9,
      east: -73.9,
      north: 40.1,
    });
    render(
      <WaypointEditDialog
        open
        onOpenChange={() => {}}
        waypoint={makeWaypoint({ id: 1, name: "Home" })}
        initialLngLat={undefined}
        channel={0}
        mapRef={{} as never}
        onRequestBoundingBoxDraw={drawFn}
      />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /waypointEdit\.drawBox/i }),
      );
    });
    expect(drawFn).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: /waypointEdit\.editBox/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /waypointEdit\.removeBox/i }),
    ).toBeInTheDocument();
  });

  it("save persists geofence fields on the outbound waypoint", async () => {
    render(
      <WaypointEditDialog
        open
        onOpenChange={() => {}}
        waypoint={makeWaypoint({ id: 7, name: "Home" })}
        initialLngLat={undefined}
        channel={0}
        mapRef={undefined}
        onRequestBoundingBoxDraw={async () => undefined}
      />,
    );

    // Pick 1 km preset (metric locale)
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /1 unit\.kilometer\.plural/i }),
      );
    });
    // Turn on enter alert
    act(() => {
      fireEvent.click(screen.getByTestId("wp-notify-enter"));
    });
    // Favorites-only
    act(() => {
      fireEvent.click(screen.getByTestId("wp-notify-fav"));
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /waypointEdit\.save/i }),
      );
    });

    expect(addWaypoint).toHaveBeenCalledOnce();
    const [outbound] = addWaypoint.mock.calls[0]!;
    expect(outbound.geofenceRadius).toBe(1000);
    expect(outbound.notifyOnEnter).toBe(true);
    expect(outbound.notifyOnExit).toBe(false);
    expect(outbound.notifyFavoritesOnly).toBe(true);
    expect(sendWaypoint).toHaveBeenCalledOnce();
  });
});
