import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";

/**
 * Generate a MyNodeInfo packet for the mock device
 */
export function generateMyNodeInfo(nodeNum: number): Protobuf.Mesh.MyNodeInfo {
  return create(Protobuf.Mesh.MyNodeInfoSchema, {
    myNodeNum: nodeNum,
    rebootCount: 1,
    minAppVersion: 30200,
  });
}

/**
 * Generate device config packets
 */
export function generateDeviceConfigs(): Protobuf.Config.Config[] {
  return [
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "device",
        value: create(Protobuf.Config.Config_DeviceConfigSchema, {
          role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
          serialEnabled: true,
          buttonGpio: 0,
          buzzerGpio: 0,
          rebroadcastMode:
            Protobuf.Config.Config_DeviceConfig_RebroadcastMode.ALL,
          nodeInfoBroadcastSecs: 10800,
          doubleTapAsButtonPress: false,
          isManaged: false,
          disableTripleClick: false,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "position",
        value: create(Protobuf.Config.Config_PositionConfigSchema, {
          positionBroadcastSecs: 900,
          positionBroadcastSmartEnabled: true,
          gpsEnabled: true,
          gpsUpdateInterval: 120,
          gpsAttemptTime: 900,
          positionFlags: 811,
          rxGpio: 0,
          txGpio: 0,
          broadcastSmartMinimumDistance: 100,
          broadcastSmartMinimumIntervalSecs: 30,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "power",
        value: create(Protobuf.Config.Config_PowerConfigSchema, {
          isPowerSaving: false,
          onBatteryShutdownAfterSecs: 0,
          adcMultiplierOverride: 0,
          waitBluetoothSecs: 60,
          sdsSecs: 4294967295,
          lsSecs: 300,
          minWakeSecs: 10,
          deviceBatteryInaAddress: 0,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "network",
        value: create(Protobuf.Config.Config_NetworkConfigSchema, {
          wifiEnabled: false,
          wifiSsid: "",
          wifiPsk: "",
          ntpServer: "0.pool.ntp.org",
          ethEnabled: false,
          addressMode: Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "display",
        value: create(Protobuf.Config.Config_DisplayConfigSchema, {
          screenOnSecs: 60,
          gpsFormat:
            Protobuf.Config.Config_DisplayConfig_DeprecatedGpsCoordinateFormat
              .UNUSED,
          autoScreenCarouselSecs: 0,
          compassNorthTop: false,
          flipScreen: false,
          units: Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC,
          oled: Protobuf.Config.Config_DisplayConfig_OledType.OLED_AUTO,
          displaymode: Protobuf.Config.Config_DisplayConfig_DisplayMode.DEFAULT,
          headingBold: false,
          wakeOnTapOrMotion: false,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "lora",
        value: create(Protobuf.Config.Config_LoRaConfigSchema, {
          usePreset: true,
          modemPreset: Protobuf.Config.Config_LoRaConfig_ModemPreset.LONG_FAST,
          bandwidth: 0,
          spreadFactor: 0,
          codingRate: 0,
          frequencyOffset: 0,
          region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
          hopLimit: 3,
          txEnabled: true,
          txPower: 30,
          channelNum: 0,
          sx126xRxBoostedGain: false,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "bluetooth",
        value: create(Protobuf.Config.Config_BluetoothConfigSchema, {
          enabled: true,
          mode: Protobuf.Config.Config_BluetoothConfig_PairingMode.RANDOM_PIN,
          fixedPin: 123456,
        }),
      },
    }),
    create(Protobuf.Config.ConfigSchema, {
      payloadVariant: {
        case: "security",
        value: create(Protobuf.Config.Config_SecurityConfigSchema, {
          publicKey: new Uint8Array(32),
          privateKey: new Uint8Array(32),
          adminKey: [],
          isManaged: false,
          serialEnabled: true,
          debugLogApiEnabled: false,
          adminChannelEnabled: false,
        }),
      },
    }),
  ];
}

/**
 * Generate module config packets
 */
export function generateModuleConfigs(): Protobuf.ModuleConfig.ModuleConfig[] {
  return [
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "mqtt",
        value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
          enabled: false,
          address: "",
          username: "",
          password: "",
          encryptionEnabled: false,
          jsonEnabled: false,
          tlsEnabled: false,
          root: "msh",
          proxyToClientEnabled: false,
          mapReportingEnabled: false,
        }),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "serial",
        value: create(Protobuf.ModuleConfig.ModuleConfig_SerialConfigSchema, {
          enabled: false,
          echo: false,
          rxd: 0,
          txd: 0,
          baud: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud
            .BAUD_DEFAULT,
          timeout: 0,
          mode: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode
            .DEFAULT,
        }),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "externalNotification",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfigSchema,
          {
            enabled: false,
            outputMs: 1000,
            output: 0,
            outputVibra: 0,
            outputBuzzer: 0,
            active: true,
            alertMessage: true,
            alertMessageVibra: false,
            alertMessageBuzzer: false,
            alertBell: true,
            alertBellVibra: false,
            alertBellBuzzer: false,
            usePwm: false,
            nagTimeout: 0,
            useI2sAsBuzzer: false,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "storeForward",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfigSchema,
          {
            enabled: false,
            heartbeat: false,
            records: 0,
            historyReturnMax: 0,
            historyReturnWindow: 0,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "rangeTest",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_RangeTestConfigSchema,
          {
            enabled: false,
            sender: 0,
            save: false,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "telemetry",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema,
          {
            deviceUpdateInterval: 900,
            environmentUpdateInterval: 900,
            environmentMeasurementEnabled: false,
            environmentScreenEnabled: false,
            environmentDisplayFahrenheit: false,
            airQualityEnabled: false,
            airQualityInterval: 900,
            powerMeasurementEnabled: false,
            powerUpdateInterval: 900,
            powerScreenEnabled: false,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "cannedMessage",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfigSchema,
          {
            rotary1Enabled: false,
            inputbrokerPinA: 0,
            inputbrokerPinB: 0,
            inputbrokerPinPress: 0,
            inputbrokerEventCw:
              Protobuf.ModuleConfig
                .ModuleConfig_CannedMessageConfig_InputEventChar.NONE,
            inputbrokerEventCcw:
              Protobuf.ModuleConfig
                .ModuleConfig_CannedMessageConfig_InputEventChar.NONE,
            inputbrokerEventPress:
              Protobuf.ModuleConfig
                .ModuleConfig_CannedMessageConfig_InputEventChar.NONE,
            updown1Enabled: false,
            enabled: false,
            allowInputSource: "",
            sendBell: false,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "audio",
        value: create(Protobuf.ModuleConfig.ModuleConfig_AudioConfigSchema, {
          codec2Enabled: false,
          pttPin: 0,
          bitrate:
            Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud
              .CODEC2_DEFAULT,
          i2sWs: 0,
          i2sSd: 0,
          i2sDin: 0,
          i2sSck: 0,
        }),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "remoteHardware",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfigSchema,
          {
            enabled: false,
            allowUndefinedPinAccess: false,
            availablePins: [],
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "neighborInfo",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfigSchema,
          {
            enabled: false,
            updateInterval: 900,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "ambientLighting",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfigSchema,
          {
            ledState: false,
            current: 10,
            red: 0,
            green: 0,
            blue: 0,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "detectionSensor",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfigSchema,
          {
            enabled: false,
            minimumBroadcastSecs: 0,
            stateBroadcastSecs: 0,
            sendBell: false,
            name: "",
            monitorPin: 0,
            detectionTriggerType:
              Protobuf.ModuleConfig
                .ModuleConfig_DetectionSensorConfig_TriggerType.LOGIC_LOW,
            usePullup: false,
          },
        ),
      },
    }),
    create(Protobuf.ModuleConfig.ModuleConfigSchema, {
      payloadVariant: {
        case: "paxcounter",
        value: create(
          Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfigSchema,
          {
            enabled: false,
            paxcounterUpdateInterval: 0,
          },
        ),
      },
    }),
  ];
}

/**
 * Generate default channels (Primary + 7 disabled)
 */
export function generateChannels(): Protobuf.Channel.Channel[] {
  const channels: Protobuf.Channel.Channel[] = [];

  // Primary channel
  channels.push(
    create(Protobuf.Channel.ChannelSchema, {
      index: 0,
      role: Protobuf.Channel.Channel_Role.PRIMARY,
      settings: create(Protobuf.Channel.ChannelSettingsSchema, {
        name: "",
        psk: new Uint8Array([1]), // Default key
        uplinkEnabled: false,
        downlinkEnabled: false,
        moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
          positionPrecision: 32,
        }),
      }),
    }),
  );

  // Secondary channels (disabled)
  for (let i = 1; i < 8; i++) {
    channels.push(
      create(Protobuf.Channel.ChannelSchema, {
        index: i,
        role: Protobuf.Channel.Channel_Role.DISABLED,
        settings: create(Protobuf.Channel.ChannelSettingsSchema, {
          name: "",
          psk: new Uint8Array([]),
          uplinkEnabled: false,
          downlinkEnabled: false,
        }),
      }),
    );
  }

  return channels;
}

/**
 * Generate device metadata
 */
export function generateMetadata(): Protobuf.Mesh.DeviceMetadata {
  return create(Protobuf.Mesh.DeviceMetadataSchema, {
    firmwareVersion: "2.5.6.abc1234",
    deviceStateVersion: 23,
    canShutdown: true,
    hasWifi: true,
    hasBluetooth: true,
    hasEthernet: false,
    role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
    positionFlags: 811,
    hwModel: Protobuf.Mesh.HardwareModel.TBEAM,
    hasRemoteHardware: false,
  });
}

/**
 * Serialize a FromRadio message to bytes
 */
export function serializeFromRadio(
  fromRadio: Protobuf.Mesh.FromRadio,
): Uint8Array {
  return toBinary(Protobuf.Mesh.FromRadioSchema, fromRadio);
}

/**
 * Create a FromRadio wrapper for myInfo
 */
export function createMyInfoPacket(
  myNodeInfo: Protobuf.Mesh.MyNodeInfo,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id: 1,
    payloadVariant: {
      case: "myInfo",
      value: myNodeInfo,
    },
  });
}

/**
 * Create a FromRadio wrapper for config
 */
export function createConfigPacket(
  config: Protobuf.Config.Config,
  id: number,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "config",
      value: config,
    },
  });
}

/**
 * Create a FromRadio wrapper for moduleConfig
 */
export function createModuleConfigPacket(
  moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
  id: number,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "moduleConfig",
      value: moduleConfig,
    },
  });
}

/**
 * Create a FromRadio wrapper for channel
 */
export function createChannelPacket(
  channel: Protobuf.Channel.Channel,
  id: number,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "channel",
      value: channel,
    },
  });
}

/**
 * Create a FromRadio wrapper for configCompleteId
 */
export function createConfigCompletePacket(
  configCompleteId: number,
  id: number,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "configCompleteId",
      value: configCompleteId,
    },
  });
}

/**
 * Create a FromRadio wrapper for metadata
 */
export function createMetadataPacket(
  metadata: Protobuf.Mesh.DeviceMetadata,
  id: number,
): Protobuf.Mesh.FromRadio {
  return create(Protobuf.Mesh.FromRadioSchema, {
    id,
    payloadVariant: {
      case: "metadata",
      value: metadata,
    },
  });
}
