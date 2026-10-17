import { useDevice } from "@core/stores";
import { firmwareAtLeast, type Protobuf } from "@meshtastic/sdk";
import { useActiveClient, useSignal } from "@meshtastic/sdk-react";

const EMPTY_REGION_PRESETS_SIGNAL = {
  value: undefined as Protobuf.Mesh.LoRaRegionPresetMap | undefined,
  peek: () => undefined as Protobuf.Mesh.LoRaRegionPresetMap | undefined,
  subscribe: () => () => {},
} as const;

const EMPTY_METADATA_SIGNAL = {
  value: undefined as Protobuf.Mesh.DeviceMetadata | undefined,
  peek: () => undefined as Protobuf.Mesh.DeviceMetadata | undefined,
  subscribe: () => () => {},
} as const;

export interface DeviceCapabilities {
  metadata?: Protobuf.Mesh.DeviceMetadata;
  /** Per-region presets, sent by firmware 2.8+ only. */
  regionPresets?: Protobuf.Mesh.LoRaRegionPresetMap;
  /** True when the node runs firmware 2.8 or newer. */
  supportsFirmware28: boolean;
  /** DeviceMetadata.excluded_modules bitmask, 0 when unknown. */
  excludedModules: number;
}

/**
 * What the connected node can do, from its DeviceMetadata and the 2.8
 * region preset map. A node that sends the map is 2.8+ even if its version
 * string does not parse.
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const client = useActiveClient();
  const { metadata: storeMetadata } = useDevice();
  const regionPresets = useSignal(
    client?.device.regionPresets ?? EMPTY_REGION_PRESETS_SIGNAL,
  );
  const clientMetadata = useSignal(
    client?.device.metadata ?? EMPTY_METADATA_SIGNAL,
  );
  const metadata = clientMetadata ?? storeMetadata.get(0);
  const supportsFirmware28 =
    regionPresets !== undefined ||
    firmwareAtLeast(metadata?.firmwareVersion ?? "", "2.8.0");

  return {
    metadata,
    regionPresets,
    supportsFirmware28,
    excludedModules: metadata?.excludedModules ?? 0,
  };
}
