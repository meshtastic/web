import type { ValidModuleConfigType } from "@core/stores";
import { Protobuf } from "@meshtastic/sdk";

const Excluded = Protobuf.Mesh.ExcludedModules;

/**
 * The DeviceMetadata.excluded_modules bit for each module config case. A
 * firmware build without a module sets its bit, and the client hides that
 * module's settings.
 */
export const MODULE_EXCLUSION_BITS: Record<
  Exclude<ValidModuleConfigType, "$unknown">,
  Protobuf.Mesh.ExcludedModules
> = {
  mqtt: Excluded.MQTT_CONFIG,
  serial: Excluded.SERIAL_CONFIG,
  externalNotification: Excluded.EXTNOTIF_CONFIG,
  storeForward: Excluded.STOREFORWARD_CONFIG,
  rangeTest: Excluded.RANGETEST_CONFIG,
  telemetry: Excluded.TELEMETRY_CONFIG,
  cannedMessage: Excluded.CANNEDMSG_CONFIG,
  audio: Excluded.AUDIO_CONFIG,
  remoteHardware: Excluded.REMOTEHARDWARE_CONFIG,
  neighborInfo: Excluded.NEIGHBORINFO_CONFIG,
  ambientLighting: Excluded.AMBIENTLIGHTING_CONFIG,
  detectionSensor: Excluded.DETECTIONSENSOR_CONFIG,
  paxcounter: Excluded.PAXCOUNTER_CONFIG,
  statusmessage: Excluded.STATUSMESSAGE_CONFIG,
  trafficManagement: Excluded.TRAFFICMANAGEMENT_CONFIG,
  tak: Excluded.TAK_CONFIG,
  meshBeacon: Excluded.MESHBEACON_CONFIG,
};

/** True when the device's excluded_modules bitmask leaves out `module`. */
export function isModuleExcluded(
  excludedModules: number,
  module: ValidModuleConfigType,
): boolean {
  if (module === "$unknown") return false;
  return (excludedModules & MODULE_EXCLUSION_BITS[module]) !== 0;
}
