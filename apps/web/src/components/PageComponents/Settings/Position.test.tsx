import { create } from "@bufbuild/protobuf";
import { STAGED_FIXED_POSITION } from "@core/utils/stagedAdminKeys.ts";
import { Protobuf } from "@meshtastic/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Position } from "./Position.tsx";

const position = create(Protobuf.Config.Config_PositionConfigSchema, {
  fixedPosition: true,
  positionBroadcastSecs: 900,
});
const stageAdminMessage = vi.fn();
let staged = new Map<string, Protobuf.Admin.AdminMessage>();

vi.mock("@app/core/hooks/useWaitForConfig", () => ({
  useWaitForConfig: () => {},
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  // The node's own position: 10, 20.
  useMyNodeAsProto: () => ({
    position: { latitudeI: 100_000_000, longitudeI: 200_000_000, altitude: 0 },
  }),
}));

vi.mock("@core/stores", () => ({
  useDevice: () => ({
    config: { position },
    getEffectiveConfig: (section: string) =>
      section === "position" ? position : undefined,
  }),
}));

vi.mock("@meshtastic/sdk-react", () => ({
  useConfigEditor: () => ({
    radio: { value: {} },
    stagedAdminMessages: { value: staged },
    setRadioSection: vi.fn(),
    stageAdminMessage,
  }),
  useSignal: (signal: { value: unknown }) => signal.value,
}));

const fixedPositionMessage = (latitude: number, longitude: number) =>
  create(Protobuf.Admin.AdminMessageSchema, {
    payloadVariant: {
      case: "setFixedPosition",
      value: create(Protobuf.Mesh.PositionSchema, {
        latitudeI: latitude * 1e7,
        longitudeI: longitude * 1e7,
      }),
    },
  });

describe("Position fixed position", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    staged = new Map();
  });

  it("shows the node's position when nothing is staged", () => {
    render(<Position onFormInit={vi.fn()} />);
    expect(screen.getByLabelText("Latitude")).toHaveValue(10);
  });

  it("shows a staged fixed position after the tab remounts", () => {
    staged = new Map([[STAGED_FIXED_POSITION, fixedPositionMessage(30, 40)]]);
    render(<Position onFormInit={vi.fn()} />);
    expect(screen.getByLabelText("Latitude")).toHaveValue(30);
    expect(screen.getByLabelText("Longitude")).toHaveValue(40);
  });

  it("keeps a staged fixed position when another field changes", async () => {
    staged = new Map([[STAGED_FIXED_POSITION, fixedPositionMessage(30, 40)]]);
    render(<Position onFormInit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Broadcast Interval"), {
      target: { value: "1800" },
    });

    await waitFor(() => expect(stageAdminMessage).toHaveBeenCalled());
    const [key, message] = stageAdminMessage.mock.lastCall ?? [];
    expect(key).toBe(STAGED_FIXED_POSITION);
    expect(message?.payloadVariant.value.latitudeI).toBe(300_000_000);
  });
});
