import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Position } from "./Position.tsx";

// Integration/component test for meshtastic/web#1051.
//
// The fixed-position altitude field is labelled in Feet when the display units
// are Imperial, but the firmware/protobuf store altitude as integer meters.
// This test renders the real <Position /> form (DynamicForm + react-hook-form +
// the zod resolver) and asserts the conversion happens at the edges:
//   - form load  (meters -> feet for display when Imperial)
//   - form submit (feet -> meters into the queued setFixedPosition admin msg)
//   - browser geolocation fill (meters -> feet for display when Imperial)
//
// The only external seam we assert on is the admin message handed to the
// config editor's queueAdminMessage(), which is exactly what the firmware
// receives.

// --- Mutable per-test state (read lazily by the mock factories below) --------
// Names are prefixed with `mock` so vitest's vi.mock hoisting whitelist allows
// the factories to reference them.
let mockDisplayUnits: Protobuf.Config.Config_DisplayConfig_DisplayUnits;
let mockPositionConfig: Protobuf.Config.Config_PositionConfig;
let mockMyNode: Protobuf.Mesh.NodeInfo | undefined;

const mockSetRadioSection = vi.fn();
const mockQueueAdminMessage = vi.fn();
const mockToast = vi.fn();
const mockGetCurrentPosition = vi.fn();

// A minimal signal-shaped object; the mocked useSignal just returns `.value`.
const mockEditor = {
  radio: { value: {}, peek: () => ({}), subscribe: () => () => {} },
  setRadioSection: mockSetRadioSection,
  queueAdminMessage: mockQueueAdminMessage,
};

const mockGetEffectiveConfig = (configCase: string) => {
  if (configCase === "display") {
    return { units: mockDisplayUnits };
  }
  if (configCase === "position") {
    return mockPositionConfig;
  }
  return undefined;
};

// useWaitForConfig throws a suspense promise until config is present; the render
// path here supplies config directly, so it is a no-op in tests.
vi.mock("@app/core/hooks/useWaitForConfig", () => ({
  useWaitForConfig: () => {},
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { position: mockPositionConfig },
    getEffectiveConfig: mockGetEffectiveConfig,
  }),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => mockEditor,
  useSignal: (signal: { value?: unknown }) => signal?.value ?? {},
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useMyNodeAsProto: () => mockMyNode,
}));

vi.mock("@core/hooks/useToast.ts", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// --- Helpers -----------------------------------------------------------------
const IMPERIAL = Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL;
const METRIC = Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC;

// San Francisco, so the fixed-position submit path (lat/lng defined) is taken.
const LATITUDE_I = 377_749_000;
const LONGITUDE_I = -1_224_194_000;

interface SetupOptions {
  units: Protobuf.Config.Config_DisplayConfig_DisplayUnits;
  altitudeMeters: number;
}

function setup({ units, altitudeMeters }: SetupOptions) {
  mockDisplayUnits = units;
  // A full, valid PositionConfig (defaults for every schema field) with a
  // fixed position enabled so the altitude field is editable and the submit
  // takes the setFixedPosition path.
  mockPositionConfig = create(Protobuf.Config.Config_PositionConfigSchema, {
    fixedPosition: true,
  });
  mockMyNode = create(Protobuf.Mesh.NodeInfoSchema, {
    num: 1,
    position: create(Protobuf.Mesh.PositionSchema, {
      latitudeI: LATITUDE_I,
      longitudeI: LONGITUDE_I,
      altitude: altitudeMeters,
    }),
  });
}

function renderPosition() {
  return render(<Position onFormInit={() => {}} />);
}

function altitudeInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>("#altitude");
  if (!input) {
    throw new Error("altitude field not found");
  }
  return input;
}

function lastQueuedPosition(): Protobuf.Mesh.Position {
  const message = mockQueueAdminMessage.mock.calls.at(
    -1,
  )?.[0] as Protobuf.Admin.AdminMessage;
  expect(message.payloadVariant.case).toBe("setFixedPosition");
  return message.payloadVariant.value as Protobuf.Mesh.Position;
}

describe("Position (altitude unit conversion, issue #1051)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Remove any geolocation override so the button does not leak into other
    // tests (the component renders it only when navigator.geolocation exists).
    if ("geolocation" in navigator) {
      Reflect.deleteProperty(navigator, "geolocation");
    }
  });

  it("Imperial: loads a 312 m altitude as ~1024 ft in the field", () => {
    setup({ units: IMPERIAL, altitudeMeters: 312 });
    const { container } = renderPosition();

    // metersToFeet(312) = 1023.62 -> rounded 1024
    expect(altitudeInput(container).value).toBe("1024");
    // The field is labelled in Feet, not Meters.
    expect(screen.getByText("Feet")).toBeInTheDocument();
    expect(screen.queryByText("Meters")).not.toBeInTheDocument();
  });

  it("Imperial: submitting 1025 ft queues setFixedPosition with altitude 312 m", async () => {
    setup({ units: IMPERIAL, altitudeMeters: 312 });
    const { container } = renderPosition();

    // DynamicForm submits on change (submitType defaults to "onChange").
    fireEvent.change(altitudeInput(container), { target: { value: "1025" } });

    await waitFor(() => expect(mockQueueAdminMessage).toHaveBeenCalled());

    const position = lastQueuedPosition();
    // feetToMeters(1025) = 312.42 -> rounded 312 (int32 meters), NOT 1025.
    expect(position.altitude).toBe(312);
    // Lat/lng round-trip untouched (still integer degrees * 1e7).
    expect(position.latitudeI).toBe(LATITUDE_I);
    expect(position.longitudeI).toBe(LONGITUDE_I);
  });

  it("Metric: submitting 312 queues setFixedPosition with altitude 312 m unchanged", async () => {
    // Start from a different metric altitude so the change event fires.
    setup({ units: METRIC, altitudeMeters: 100 });
    const { container } = renderPosition();

    // Metric field shows raw meters, no conversion.
    expect(altitudeInput(container).value).toBe("100");
    expect(screen.getByText("Meters")).toBeInTheDocument();

    fireEvent.change(altitudeInput(container), { target: { value: "312" } });

    await waitFor(() => expect(mockQueueAdminMessage).toHaveBeenCalled());

    expect(lastQueuedPosition().altitude).toBe(312);
  });

  it("Imperial: browser geolocation fills the field in feet (100 m -> 328 ft)", async () => {
    setup({ units: IMPERIAL, altitudeMeters: 312 });

    // Geolocation reports meters; component must convert to feet for display.
    mockGetCurrentPosition.mockImplementation((success: PositionCallback) =>
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 100,
          accuracy: 5,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
      } as GeolocationPosition),
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: mockGetCurrentPosition },
    });

    const { container } = renderPosition();

    // Sanity: starts at the loaded 312 m -> 1024 ft.
    expect(altitudeInput(container).value).toBe("1024");

    fireEvent.click(
      screen.getByRole("button", { name: /use browser location/i }),
    );

    // metersToFeet(100) = 328.08 -> rounded 328
    await waitFor(() => expect(altitudeInput(container).value).toBe("328"));
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("clearing the altitude field does not queue a setFixedPosition", async () => {
    // Regression coverage requested by CodeRabbit. Clearing a number field
    // yields NaN (FormInput does Number.parseFloat("").toString() === "NaN"),
    // which fails altitude's `z.coerce.number().optional()` validation. Because
    // DynamicForm submits via handleSubmit(onSubmit) on change, an invalid form
    // never calls onSubmit, so nothing is queued. The `Number.isFinite(...) ? ...
    // : 0` guard in onSubmit is thus defensive and unreachable through the form.
    setup({ units: METRIC, altitudeMeters: 100 });
    const { container } = renderPosition();

    // Baseline: a valid edit queues exactly one setFixedPosition, proving the
    // form is wired up and submits on change.
    fireEvent.change(altitudeInput(container), { target: { value: "150" } });
    await waitFor(() => expect(mockQueueAdminMessage).toHaveBeenCalledTimes(1));
    expect(lastQueuedPosition().altitude).toBe(150);

    // Clear the field -> NaN -> invalid -> must NOT queue anything.
    fireEvent.change(altitudeInput(container), { target: { value: "" } });

    // Recover with another valid edit and synchronize on its value landing.
    // Then assert exactly two queues total (150 then 200): if the clear had
    // queued, the count would be three. Synchronizing on the settled value
    // (not a bare negative assertion) keeps this non-racy.
    fireEvent.change(altitudeInput(container), { target: { value: "200" } });
    await waitFor(() => expect(lastQueuedPosition().altitude).toBe(200));
    expect(mockQueueAdminMessage).toHaveBeenCalledTimes(2);
  });
});
