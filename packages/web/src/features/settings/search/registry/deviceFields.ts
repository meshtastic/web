import type { FieldRegistryEntry } from "../types.ts";

export const deviceFieldRegistry: FieldRegistryEntry[] = [
  {
    section: "device",
    tab: "user",
    groupLabelKey: "user.title",
    fields: [
      {
        name: "longName",
        labelKey: "user.longName.label",
        descriptionKey: "user.longName.description",
      },
      {
        name: "shortName",
        labelKey: "user.shortName.label",
        descriptionKey: "user.shortName.description",
      },
      {
        name: "isUnmessageable",
        labelKey: "user.isUnmessageable.label",
        descriptionKey: "user.isUnmessageable.description",
      },
      {
        name: "isLicensed",
        labelKey: "user.isLicensed.label",
        descriptionKey: "user.isLicensed.description",
      },
    ],
  },
  {
    section: "device",
    tab: "device",
    groupLabelKey: "device.title",
    fields: [
      {
        name: "role",
        labelKey: "device.role.label",
        descriptionKey: "device.role.description",
      },
      {
        name: "buttonGpio",
        labelKey: "device.buttonPin.label",
        descriptionKey: "device.buttonPin.description",
      },
      {
        name: "buzzerGpio",
        labelKey: "device.buzzerPin.label",
        descriptionKey: "device.buzzerPin.description",
      },
      {
        name: "rebroadcastMode",
        labelKey: "device.rebroadcastMode.label",
        descriptionKey: "device.rebroadcastMode.description",
      },
      {
        name: "nodeInfoBroadcastSecs",
        labelKey: "device.nodeInfoBroadcastInterval.label",
        descriptionKey: "device.nodeInfoBroadcastInterval.description",
      },
      {
        name: "doubleTapAsButtonPress",
        labelKey: "device.doubleTapAsButtonPress.label",
        descriptionKey: "device.doubleTapAsButtonPress.description",
      },
      {
        name: "disableTripleClick",
        labelKey: "device.disableTripleClick.label",
        descriptionKey: "device.disableTripleClick.description",
      },
      {
        name: "tzdef",
        labelKey: "device.posixTimezone.label",
        descriptionKey: "device.posixTimezone.description",
      },
      {
        name: "ledHeartbeatDisabled",
        labelKey: "device.ledHeartbeatDisabled.label",
        descriptionKey: "device.ledHeartbeatDisabled.description",
      },
    ],
  },
  {
    section: "device",
    tab: "position",
    groupLabelKey: "position.title",
    fields: [
      {
        name: "positionBroadcastSmartEnabled",
        labelKey: "position.smartPositionEnabled.label",
        descriptionKey: "position.smartPositionEnabled.description",
      },
      {
        name: "gpsMode",
        labelKey: "position.gpsMode.label",
        descriptionKey: "position.gpsMode.description",
      },
      {
        name: "fixedPosition",
        labelKey: "position.fixedPosition.label",
        descriptionKey: "position.fixedPosition.description",
      },
      {
        name: "latitude",
        labelKey: "position.fixedPosition.latitude.label",
        descriptionKey: "position.fixedPosition.latitude.description",
      },
      {
        name: "longitude",
        labelKey: "position.fixedPosition.longitude.label",
        descriptionKey: "position.fixedPosition.longitude.description",
      },
      {
        name: "altitude",
        labelKey: "position.fixedPosition.altitude.label",
        descriptionKey: "position.fixedPosition.altitude.description",
      },
      {
        name: "positionFlags",
        labelKey: "position.positionFlags.label",
        descriptionKey: "position.positionFlags.description",
      },
      {
        name: "rxGpio",
        labelKey: "position.receivePin.label",
        descriptionKey: "position.receivePin.description",
      },
      {
        name: "txGpio",
        labelKey: "position.transmitPin.label",
        descriptionKey: "position.transmitPin.description",
      },
      {
        name: "gpsEnGpio",
        labelKey: "position.enablePin.label",
        descriptionKey: "position.enablePin.description",
      },
      {
        name: "positionBroadcastSecs",
        labelKey: "position.broadcastInterval.label",
        descriptionKey: "position.broadcastInterval.description",
      },
      {
        name: "gpsUpdateInterval",
        labelKey: "position.gpsUpdateInterval.label",
        descriptionKey: "position.gpsUpdateInterval.description",
      },
      {
        name: "broadcastSmartMinimumDistance",
        labelKey: "position.smartPositionMinDistance.label",
        descriptionKey: "position.smartPositionMinDistance.description",
      },
      {
        name: "broadcastSmartMinimumIntervalSecs",
        labelKey: "position.smartPositionMinInterval.label",
        descriptionKey: "position.smartPositionMinInterval.description",
      },
    ],
  },
  {
    section: "device",
    tab: "power",
    groupLabelKey: "power.title",
    fields: [
      {
        name: "isPowerSaving",
        labelKey: "power.powerSavingEnabled.label",
        descriptionKey: "power.powerSavingEnabled.description",
      },
      {
        name: "onBatteryShutdownAfterSecs",
        labelKey: "power.shutdownOnBatteryDelay.label",
        descriptionKey: "power.shutdownOnBatteryDelay.description",
      },
      {
        name: "adcMultiplierOverride",
        labelKey: "power.adcMultiplierOverride.label",
        descriptionKey: "power.adcMultiplierOverride.description",
      },
      {
        name: "waitBluetoothSecs",
        labelKey: "power.noConnectionBluetoothDisabled.label",
        descriptionKey: "power.noConnectionBluetoothDisabled.description",
      },
      {
        name: "deviceBatteryInaAddress",
        labelKey: "power.ina219Address.label",
        descriptionKey: "power.ina219Address.description",
      },
      {
        name: "sdsSecs",
        labelKey: "power.superDeepSleepDuration.label",
        descriptionKey: "power.superDeepSleepDuration.description",
      },
      {
        name: "lsSecs",
        labelKey: "power.lightSleepDuration.label",
        descriptionKey: "power.lightSleepDuration.description",
      },
      {
        name: "minWakeSecs",
        labelKey: "power.minimumWakeTime.label",
        descriptionKey: "power.minimumWakeTime.description",
      },
    ],
  },
  {
    section: "device",
    tab: "network",
    groupLabelKey: "network.title",
    fields: [
      {
        name: "wifiEnabled",
        labelKey: "network.wifiEnabled.label",
        descriptionKey: "network.wifiEnabled.description",
      },
      {
        name: "wifiSsid",
        labelKey: "network.ssid.label",
        descriptionKey: "network.ssid.description",
      },
      {
        name: "wifiPsk",
        labelKey: "network.psk.label",
        descriptionKey: "network.psk.description",
      },
      {
        name: "ethEnabled",
        labelKey: "network.ethernetEnabled.label",
        descriptionKey: "network.ethernetEnabled.description",
      },
      {
        name: "addressMode",
        labelKey: "network.addressMode.label",
        descriptionKey: "network.addressMode.description",
      },
      {
        name: "ipv4Config.ip",
        labelKey: "network.ip.label",
        descriptionKey: "network.ip.description",
      },
      {
        name: "ipv4Config.gateway",
        labelKey: "network.gateway.label",
        descriptionKey: "network.gateway.description",
      },
      {
        name: "ipv4Config.subnet",
        labelKey: "network.subnet.label",
        descriptionKey: "network.subnet.description",
      },
      {
        name: "ipv4Config.dns",
        labelKey: "network.dns.label",
        descriptionKey: "network.dns.description",
      },
      {
        name: "ntpServer",
        labelKey: "network.ntpServer.label",
        descriptionKey: "network.ntpServer.description",
      },
      {
        name: "rsyslogServer",
        labelKey: "network.rsyslogServer.label",
        descriptionKey: "network.rsyslogServer.description",
      },
    ],
  },
  {
    section: "device",
    tab: "display",
    groupLabelKey: "display.title",
    fields: [
      {
        name: "screenOnSecs",
        labelKey: "display.screenTimeout.label",
        descriptionKey: "display.screenTimeout.description",
      },
      {
        name: "gpsFormat",
        labelKey: "display.gpsDisplayUnits.label",
        descriptionKey: "display.gpsDisplayUnits.description",
      },
      {
        name: "autoScreenCarouselSecs",
        labelKey: "display.carouselDelay.label",
        descriptionKey: "display.carouselDelay.description",
      },
      {
        name: "compassNorthTop",
        labelKey: "display.compassNorthTop.label",
        descriptionKey: "display.compassNorthTop.description",
      },
      {
        name: "use12hClock",
        labelKey: "display.twelveHourClock.label",
        descriptionKey: "display.twelveHourClock.description",
      },
      {
        name: "flipScreen",
        labelKey: "display.flipScreen.label",
        descriptionKey: "display.flipScreen.description",
      },
      {
        name: "units",
        labelKey: "display.displayUnits.label",
        descriptionKey: "display.displayUnits.description",
      },
      {
        name: "oled",
        labelKey: "display.oledType.label",
        descriptionKey: "display.oledType.description",
      },
      {
        name: "displaymode",
        labelKey: "display.displayMode.label",
        descriptionKey: "display.displayMode.description",
      },
      {
        name: "headingBold",
        labelKey: "display.headingBold.label",
        descriptionKey: "display.headingBold.description",
      },
      {
        name: "wakeOnTapOrMotion",
        labelKey: "display.wakeOnTapOrMotion.label",
        descriptionKey: "display.wakeOnTapOrMotion.description",
      },
    ],
  },
  {
    section: "device",
    tab: "bluetooth",
    groupLabelKey: "bluetooth.title",
    fields: [
      {
        name: "enabled",
        labelKey: "bluetooth.enabled.label",
        descriptionKey: "bluetooth.enabled.description",
      },
      {
        name: "mode",
        labelKey: "bluetooth.pairingMode.label",
        descriptionKey: "bluetooth.pairingMode.description",
      },
      {
        name: "fixedPin",
        labelKey: "bluetooth.pin.label",
        descriptionKey: "bluetooth.pin.description",
      },
    ],
  },
];
