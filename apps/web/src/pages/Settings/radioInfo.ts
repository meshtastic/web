import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { Protobuf } from "@core/protobuf.ts";

export interface RadioInfo {
  /** Firmware version string as the radio reports it, e.g. `2.8.1.8e6a88d`. */
  readonly firmware?: string;
  /** Hardware model enum name, e.g. `HELTEC_V4`. */
  readonly hardware?: string;
  /** Hardware model number, e.g. `110` for `HELTEC_V4`. */
  readonly hwModel?: number;
}

/** Firmware and hardware of the connected radio, when it has reported them. */
export function useRadioInfo(): RadioInfo {
  const { metadata } = useDeviceCapabilities();
  const hwModel = useMyNodeAsProto()?.user?.hwModel;
  const firmware = metadata?.firmwareVersion || undefined;
  const known =
    hwModel === undefined || hwModel === Protobuf.Mesh.HardwareModel.UNSET
      ? undefined
      : hwModel;
  const hardware =
    known === undefined
      ? undefined
      : (Protobuf.Mesh.HardwareModel[known] ?? String(known));
  return { firmware, hardware, hwModel: known };
}
