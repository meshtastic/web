import type {
  ModuleConfig,
  ModuleConfigSection,
} from "@core/kmp/configEditor.ts";

/**
 * On/off for the Module configuration list, from the module's own config.
 * `undefined` when the config hasn't arrived or the module has no single
 * on switch (Canned Messages' flag is deprecated; TAK and Mesh Beacon have
 * none).
 */
export type ModuleState = "on" | "off";

const onOff = (enabled: boolean | undefined): ModuleState | undefined =>
  enabled === undefined ? undefined : enabled ? "on" : "off";

export function moduleState(
  key: ModuleConfigSection,
  modules: ModuleConfig,
): ModuleState | undefined {
  switch (key) {
    case "mqtt":
      return onOff(modules.mqtt?.enabled);
    case "serial":
      return onOff(modules.serial?.enabled);
    case "externalNotification":
      return onOff(modules.externalNotification?.enabled);
    case "storeForward":
      return onOff(modules.storeForward?.enabled);
    case "rangeTest":
      return onOff(modules.rangeTest?.enabled);
    case "telemetry": {
      const tel = modules.telemetry;
      if (!tel) return undefined;
      return onOff(
        tel.deviceTelemetryEnabled ||
          tel.environmentMeasurementEnabled ||
          tel.airQualityEnabled ||
          tel.powerMeasurementEnabled ||
          tel.healthMeasurementEnabled,
      );
    }
    case "audio":
      return onOff(modules.audio?.codec2Enabled);
    case "remoteHardware":
      return onOff(modules.remoteHardware?.enabled);
    case "neighborInfo":
      return onOff(modules.neighborInfo?.enabled);
    case "ambientLighting":
      return onOff(modules.ambientLighting?.ledState);
    case "detectionSensor":
      return onOff(modules.detectionSensor?.enabled);
    case "paxcounter":
      return onOff(modules.paxcounter?.enabled);
    // No single on switch: Canned Messages' flag is deprecated; the rest
    // are configured elsewhere or are always on.
    case "cannedMessage":
    case "statusmessage":
    case "trafficManagement":
    case "tak":
    case "meshBeacon":
      return undefined;
    default: {
      const unhandled: never = key;
      return unhandled;
    }
  }
}
