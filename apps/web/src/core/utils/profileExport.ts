import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import { Protobuf, type ConfigEditor } from "@meshtastic/sdk";

export function exportProfile(editor: ConfigEditor) {
  const radio = editor.radio.peek();
  const modules = editor.modules.peek();
  const owner = editor.owner.peek();

  const profile = create(Protobuf.ClientOnly.DeviceProfileSchema, {
    longName: owner?.longName,
    shortName: owner?.shortName,
    // @ts-expect-error fixedPosition is mapped dynamically in some contexts
    fixedPosition: radio.fixedPosition,
    config: {
      device: radio.device,
      position: radio.position,
      power: radio.power,
      network: radio.network,
      display: radio.display,
      lora: radio.lora,
      bluetooth: radio.bluetooth,
      security: radio.security,
      sessionkey: radio.sessionkey,
    },
    moduleConfig: {
      mqtt: modules.mqtt,
      serial: modules.serial,
      extNotification: modules.extNotification,
      storeForward: modules.storeForward,
      rangeTest: modules.rangeTest,
      telemetry: modules.telemetry,
      cannedMessage: modules.cannedMessage,
      audio: modules.audio,
      neighborInfo: modules.neighborInfo,
      ambientLighting: modules.ambientLighting,
      detectionSensor: modules.detectionSensor,
      paxcounter: modules.paxcounter,
    }
  });

  const bytes = toBinary(Protobuf.ClientOnly.DeviceProfileSchema, profile);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "profile.cfg";
  a.click();
  URL.revokeObjectURL(url);
}

export function importProfile(bytes: Uint8Array, editor: ConfigEditor) {
  const profile = fromBinary(Protobuf.ClientOnly.DeviceProfileSchema, bytes);

  if (profile.longName || profile.shortName) {
    editor.setOwner({
      longName: profile.longName || editor.owner.peek()?.longName || "",
      shortName: profile.shortName || editor.owner.peek()?.shortName || "",
      macaddr: editor.owner.peek()?.macaddr || new Uint8Array(),
      id: editor.owner.peek()?.id || "",
      hwModel: editor.owner.peek()?.hwModel || 0,
      isLicensed: editor.owner.peek()?.isLicensed || false,
      role: editor.owner.peek()?.role || 0,
      publicKey: editor.owner.peek()?.publicKey || new Uint8Array(),
    });
  }

  const config = profile.config;
  if (config) {
    if (config.device) editor.setRadioSection("device", config.device);
    if (config.position) editor.setRadioSection("position", config.position);
    if (config.power) editor.setRadioSection("power", config.power);
    if (config.network) editor.setRadioSection("network", config.network);
    if (config.display) editor.setRadioSection("display", config.display);
    if (config.lora) editor.setRadioSection("lora", config.lora);
    if (config.bluetooth) editor.setRadioSection("bluetooth", config.bluetooth);
    if (config.security) editor.setRadioSection("security", config.security);
    if (config.sessionkey) editor.setRadioSection("sessionkey", config.sessionkey);
  }

  const moduleConfig = profile.moduleConfig;
  if (moduleConfig) {
    if (moduleConfig.mqtt) editor.setModuleSection("mqtt", moduleConfig.mqtt);
    if (moduleConfig.serial) editor.setModuleSection("serial", moduleConfig.serial);
    if (moduleConfig.extNotification) editor.setModuleSection("extNotification", moduleConfig.extNotification);
    if (moduleConfig.storeForward) editor.setModuleSection("storeForward", moduleConfig.storeForward);
    if (moduleConfig.rangeTest) editor.setModuleSection("rangeTest", moduleConfig.rangeTest);
    if (moduleConfig.telemetry) editor.setModuleSection("telemetry", moduleConfig.telemetry);
    if (moduleConfig.cannedMessage) editor.setModuleSection("cannedMessage", moduleConfig.cannedMessage);
    if (moduleConfig.audio) editor.setModuleSection("audio", moduleConfig.audio);
    if (moduleConfig.neighborInfo) editor.setModuleSection("neighborInfo", moduleConfig.neighborInfo);
    if (moduleConfig.ambientLighting) editor.setModuleSection("ambientLighting", moduleConfig.ambientLighting);
    if (moduleConfig.detectionSensor) editor.setModuleSection("detectionSensor", moduleConfig.detectionSensor);
    if (moduleConfig.paxcounter) editor.setModuleSection("paxcounter", moduleConfig.paxcounter);
  }

  if (profile.fixedPosition) {
    editor.queueAdminMessage({
      payloadVariant: {
        case: "setFixedPosition",
        value: profile.fixedPosition
      }
    });
  }
}
