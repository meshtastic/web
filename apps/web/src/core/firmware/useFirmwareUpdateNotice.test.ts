import { toReadonly } from "@core/kmp/signals.ts";
import { Protobuf } from "@core/protobuf.ts";
import { signal } from "@preact/signals-core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFirmwareUpdateNotice } from "./useFirmwareUpdateNotice.ts";
import {
  createFirmwareUpdateSources,
  HARDWARE_URL,
  RELEASES_URL,
} from "./updateSources.ts";

const device = vi.hoisted(() => ({
  current: undefined as unknown,
}));

vi.mock("@core/kmp/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@core/kmp/hooks")>()),
  useActiveClient: () => device.current,
}));

vi.mock("@core/hooks/useNodesAsProto.ts", () => ({
  useLocalNodeAsProto: () => undefined,
}));

const MANIFEST_URL =
  "https://release.meshtastic.org/2.7.26.54e0d8d/firmware-2.7.26.54e0d8d.json";

const responses: Record<string, unknown> = {
  [RELEASES_URL]: { releases: { stable: [{ id: "v2.7.26.54e0d8d" }] } },
  [HARDWARE_URL]: [{ hwModel: 110, platformioTarget: "heltec-v4" }],
  [MANIFEST_URL]: { targets: [{ board: "heltec-v4" }] },
};

const onlineFetch = vi.fn((url: string) =>
  Promise.resolve(
    url in responses
      ? new Response(JSON.stringify(responses[url]), { status: 200 })
      : new Response("", { status: 404 }),
  ),
);

const fakeDevice = (firmwareVersion: string, myNodeNum = 0x1234abcd) => {
  const configured = signal(true);
  const metadata = signal<Protobuf.Mesh.DeviceMetadata | undefined>({
    firmwareVersion,
    hwModel: Protobuf.Mesh.HardwareModel.HELTEC_V4,
  } as Protobuf.Mesh.DeviceMetadata);
  const session = {
    device: {
      isConfigured: toReadonly(configured),
      myNodeNum: toReadonly(signal(myNodeNum)),
      metadata: toReadonly(metadata),
      myNodeInfo: toReadonly(
        signal({ pioEnv: "heltec-v4" } as Protobuf.Mesh.MyNodeInfo),
      ),
    },
  };
  return { session, configured, metadata };
};

describe("useFirmwareUpdateNotice", () => {
  beforeEach(() => {
    device.current = undefined;
    onlineFetch.mockClear();
  });

  it("nudges the connected radio and links the flasher to its hardware", async () => {
    device.current = fakeDevice("2.7.15.567b8ea").session;
    const sources = createFirmwareUpdateSources(onlineFetch);
    const { result } = renderHook(() => useFirmwareUpdateNotice(sources));
    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.notice.notificationKey).toBe(
      "firmware-update-notified:!1234abcd:heltec-v4:2.7.26",
    );
    expect(result.current?.flasherUrl).toContain(
      `hwModel=${Protobuf.Mesh.HardwareModel.HELTEC_V4}`,
    );
  });

  it("clears on disconnect and once the radio is current", async () => {
    const fake = fakeDevice("2.7.15.567b8ea");
    device.current = fake.session;
    const sources = createFirmwareUpdateSources(onlineFetch);
    const { result } = renderHook(() => useFirmwareUpdateNotice(sources));
    await waitFor(() => expect(result.current).toBeDefined());

    act(() => {
      fake.configured.value = false;
    });
    expect(result.current).toBeUndefined();

    act(() => {
      fake.configured.value = true;
      fake.metadata.value = {
        firmwareVersion: "2.7.26.54e0d8d",
        hwModel: Protobuf.Mesh.HardwareModel.HELTEC_V4,
      } as Protobuf.Mesh.DeviceMetadata;
    });
    expect(result.current).toBeUndefined();
    // Let the re-check (from cache) settle: still nothing.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toBeUndefined();
  });

  it("drops one radio's notice when another connects", async () => {
    device.current = fakeDevice("2.7.15.567b8ea").session;
    const sources = createFirmwareUpdateSources(onlineFetch);
    const { result, rerender } = renderHook(() =>
      useFirmwareUpdateNotice(sources),
    );
    await waitFor(() => expect(result.current).toBeDefined());
    device.current = fakeDevice("2.7.15.567b8ea", 0x99990000).session;
    rerender();
    // The first radio's notice is gone at once; the new one is checked afresh.
    expect(result.current).toBeUndefined();
    await waitFor(() =>
      expect(result.current?.notice.notificationKey).toBe(
        "firmware-update-notified:!99990000:heltec-v4:2.7.26",
      ),
    );
  });

  it("shows nothing when offline", async () => {
    device.current = fakeDevice("2.7.15.567b8ea").session;
    const offlineFetch = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );
    const sources = createFirmwareUpdateSources(offlineFetch);
    const { result } = renderHook(() => useFirmwareUpdateNotice(sources));
    await waitFor(() => expect(offlineFetch).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current).toBeUndefined();
  });

  it("does nothing without a connected radio", () => {
    const sources = createFirmwareUpdateSources(onlineFetch);
    const { result } = renderHook(() => useFirmwareUpdateNotice(sources));
    expect(result.current).toBeUndefined();
    expect(onlineFetch).not.toHaveBeenCalled();
  });
});
