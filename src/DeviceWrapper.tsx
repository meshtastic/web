import type React from "react";

import { Device, DeviceContext } from "./core/stores/deviceStore.js";

export interface DeviceProps {
  children: React.ReactNode;
  device: Device;
}

// const cleanupListeners = (connection: IConnection): void => {
//   connection.onMeshPacket.cancelAll();
//   connection.onDeviceStatus.cancelAll();
//   connection.onMyNodeInfo.cancelAll();
//   connection.onUserPacket.cancelAll();
//   connection.onPositionPacket.cancelAll();
//   connection.onNodeInfoPacket.cancelAll();
//   connection.onAdminPacket.cancelAll();
//   connection.onMeshHeartbeat.cancelAll();
//   connection.onTextPacket.cancelAll();
// };

export const DeviceWrapper = ({
  children,
  device,
}: DeviceProps): JSX.Element => {
  // const fetchConfig = useCallback(async (): Promise<void> => {
  //   /**
  //    * Get Config
  //    */
  //   await device.connection?.getConfig(
  //     Protobuf.AdminMessage_ConfigType.DEVICE_CONFIG
  //   );
  //   await device.connection?.getConfig(
  //     Protobuf.AdminMessage_ConfigType.WIFI_CONFIG
  //   );
  //   await device.connection?.getConfig(
  //     Protobuf.AdminMessage_ConfigType.POSITION_CONFIG
  //   );
  //   await device.connection?.getConfig(
  //     Protobuf.AdminMessage_ConfigType.DISPLAY_CONFIG
  //   );
  //   await device.connection?.getConfig(
  //     Protobuf.AdminMessage_ConfigType.LORA_CONFIG
  //   );
  //   await device.connection?.getConfig(
  //     Protobuf.AdminMessage_ConfigType.POWER_CONFIG
  //   );

  //   /**
  //    * Get Module Config
  //    */
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.MQTT_CONFIG
  //   );
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.SERIAL_CONFIG
  //   );
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.EXTNOTIF_CONFIG
  //   );
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.STOREFORWARD_CONFIG
  //   );
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.RANGETEST_CONFIG
  //   );
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.TELEMETRY_CONFIG
  //   );
  //   await device.connection?.getModuleConfig(
  //     Protobuf.AdminMessage_ModuleConfigType.CANNEDMSG_CONFIG
  //   );
  // }, [device.connection]);

  // useEffect(() => {
  //   if (device.ready) {
  //     void fetchConfig();
  //   }
  // }, [device.ready, fetchConfig]);

  return (
    <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>
  );
};
