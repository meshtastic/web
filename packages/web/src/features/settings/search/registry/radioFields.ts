import type { FieldRegistryEntry } from "../types.ts";

export const radioFieldRegistry: FieldRegistryEntry[] = [
  {
    section: "radio",
    tab: "lora",
    groupLabelKey: "lora.title",
    fields: [
      {
        name: "region",
        labelKey: "lora.region.label",
        descriptionKey: "lora.region.description",
      },
      {
        name: "hopLimit",
        labelKey: "lora.hopLimit.label",
        descriptionKey: "lora.hopLimit.description",
      },
      {
        name: "channelNum",
        labelKey: "lora.frequencySlot.label",
        descriptionKey: "lora.frequencySlot.description",
      },
      {
        name: "ignoreMqtt",
        labelKey: "lora.ignoreMqtt.label",
        descriptionKey: "lora.ignoreMqtt.description",
      },
      {
        name: "configOkToMqtt",
        labelKey: "lora.okToMqtt.label",
        descriptionKey: "lora.okToMqtt.description",
      },
      {
        name: "usePreset",
        labelKey: "lora.usePreset.label",
        descriptionKey: "lora.usePreset.description",
      },
      {
        name: "modemPreset",
        labelKey: "lora.modemPreset.label",
        descriptionKey: "lora.modemPreset.description",
      },
      {
        name: "bandwidth",
        labelKey: "lora.bandwidth.label",
        descriptionKey: "lora.bandwidth.description",
      },
      {
        name: "spreadFactor",
        labelKey: "lora.spreadingFactor.label",
        descriptionKey: "lora.spreadingFactor.description",
      },
      {
        name: "codingRate",
        labelKey: "lora.codingRate.label",
        descriptionKey: "lora.codingRate.description",
      },
      {
        name: "txEnabled",
        labelKey: "lora.transmitEnabled.label",
        descriptionKey: "lora.transmitEnabled.description",
      },
      {
        name: "txPower",
        labelKey: "lora.transmitPower.label",
        descriptionKey: "lora.transmitPower.description",
      },
      {
        name: "overrideDutyCycle",
        labelKey: "lora.overrideDutyCycle.label",
        descriptionKey: "lora.overrideDutyCycle.description",
      },
      {
        name: "frequencyOffset",
        labelKey: "lora.frequencyOffset.label",
        descriptionKey: "lora.frequencyOffset.description",
      },
      {
        name: "sx126xRxBoostedGain",
        labelKey: "lora.boostedRxGain.label",
        descriptionKey: "lora.boostedRxGain.description",
      },
      {
        name: "overrideFrequency",
        labelKey: "lora.overrideFrequency.label",
        descriptionKey: "lora.overrideFrequency.description",
      },
    ],
  },
  {
    section: "radio",
    tab: "channels",
    groupLabelKey: "page.channels.title",
    fields: [
      {
        name: "role",
        labelKey: "role.label",
        descriptionKey: "role.description",
        namespace: "channels",
      },
      {
        name: "settings.psk",
        labelKey: "psk.label",
        descriptionKey: "psk.description",
        namespace: "channels",
      },
      {
        name: "settings.name",
        labelKey: "name.label",
        descriptionKey: "name.description",
        namespace: "channels",
      },
      {
        name: "settings.moduleSettings.positionPrecision",
        labelKey: "positionPrecision.label",
        descriptionKey: "positionPrecision.description",
        namespace: "channels",
      },
      {
        name: "settings.uplinkEnabled",
        labelKey: "uplinkEnabled.label",
        descriptionKey: "uplinkEnabled.description",
        namespace: "channels",
      },
      {
        name: "settings.downlinkEnabled",
        labelKey: "downlinkEnabled.label",
        descriptionKey: "downlinkEnabled.description",
        namespace: "channels",
      },
    ],
  },
  {
    section: "radio",
    tab: "security",
    groupLabelKey: "security.title",
    fields: [
      {
        name: "privateKey",
        labelKey: "security.privateKey.label",
        descriptionKey: "security.privateKey.description",
      },
      {
        name: "publicKey",
        labelKey: "security.publicKey.label",
        descriptionKey: "security.publicKey.description",
      },
      {
        name: "adminKey.0",
        labelKey: "security.primaryAdminKey.label",
        descriptionKey: "security.primaryAdminKey.description",
      },
      {
        name: "adminKey.1",
        labelKey: "security.secondaryAdminKey.label",
        descriptionKey: "security.secondaryAdminKey.description",
      },
      {
        name: "adminKey.2",
        labelKey: "security.tertiaryAdminKey.label",
        descriptionKey: "security.tertiaryAdminKey.description",
      },
      {
        name: "isManaged",
        labelKey: "security.managed.label",
        descriptionKey: "security.managed.description",
      },
      {
        name: "adminChannelEnabled",
        labelKey: "security.adminChannelEnabled.label",
        descriptionKey: "security.adminChannelEnabled.description",
      },
      {
        name: "debugLogApiEnabled",
        labelKey: "security.enableDebugLogApi.label",
        descriptionKey: "security.enableDebugLogApi.description",
      },
      {
        name: "serialEnabled",
        labelKey: "security.serialOutputEnabled.label",
        descriptionKey: "security.serialOutputEnabled.description",
      },
    ],
  },
];
