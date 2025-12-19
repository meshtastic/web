import type { NetworkValidation } from "../../../validation/config/network";
import {
  ConfigFormFields,
  type FieldGroup,
} from "../../form/ConfigFormFields";
import { Protobuf } from "@meshtastic/core";
import { useNetworkForm } from "../../../hooks";
import { ConfigFormSkeleton } from "../../../pages/SettingsLoading";
import { useTranslation } from "react-i18next";

export const Network = () => {
  const { t } = useTranslation("config");
  const { form, isReady, isDisabledByField } = useNetworkForm();

  if (!isReady) {
    return <ConfigFormSkeleton />;
  }

  const fieldGroups: FieldGroup<NetworkValidation>[] = [
    {
      label: t("network.title"),
      description: t("network.description"),
      fields: [
        {
          type: "toggle",
          name: "wifiEnabled",
          label: t("network.wifiEnabled.label"),
          description: t("network.wifiEnabled.description"),
        },
        {
          type: "text",
          name: "wifiSsid",
          label: t("network.ssid.label"),
          description: t("network.ssid.label"),
          disabledBy: [{ fieldName: "wifiEnabled" }],
        },
        {
          type: "password",
          name: "wifiPsk",
          label: t("network.psk.label"),
          description: t("network.psk.description"),
          disabledBy: [{ fieldName: "wifiEnabled" }],
        },
      ],
    },
    {
      label: t("network.ethernetConfigSettings.label"),
      description: t("network.ethernetConfigSettings.description"),
      fields: [
        {
          type: "toggle",
          name: "ethEnabled",
          label: t("network.ethernetEnabled.label"),
          description: t("network.ethernetEnabled.description"),
        },
      ],
    },
    {
      label: t("network.ipConfigSettings.label"),
      description: t("network.ipConfigSettings.description"),
      fields: [
        {
          type: "select",
          name: "addressMode",
          label: t("network.addressMode.label"),
          description: t("network.addressMode.description"),
          properties: {
            enumValue: Protobuf.Config.Config_NetworkConfig_AddressMode,
          },
        },
        {
          type: "text",
          name: "ipv4Config.ip",
          label: t("network.ip.label"),
          description: t("network.ip.description"),
          disabledBy: [
            {
              fieldName: "addressMode",
              selector: Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
            },
          ],
        },
        {
          type: "text",
          name: "ipv4Config.gateway",
          label: t("network.gateway.label"),
          description: t("network.gateway.description"),
          disabledBy: [
            {
              fieldName: "addressMode",
              selector: Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
            },
          ],
        },
        {
          type: "text",
          name: "ipv4Config.subnet",
          label: t("network.subnet.label"),
          description: t("network.subnet.description"),
          disabledBy: [
            {
              fieldName: "addressMode",
              selector: Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
            },
          ],
        },
        {
          type: "text",
          name: "ipv4Config.dns",
          label: t("network.dns.label"),
          description: t("network.dns.description"),
          disabledBy: [
            {
              fieldName: "addressMode",
              selector: Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
            },
          ],
        },
      ],
    },
    {
      label: t("network.udpConfigSettings.label"),
      description: t("network.udpConfigSettings.description"),
      fields: [
        {
          type: "select",
          name: "enabledProtocols",
          label: t("network.meshViaUdp.label"),
          properties: {
            enumValue: Protobuf.Config.Config_NetworkConfig_ProtocolFlags,
            formatEnumName: true,
          },
        },
      ],
    },
    {
      label: t("network.ntpConfigSettings.label"),
      description: t("network.ntpConfigSettings.description"),
      fields: [
        {
          type: "text",
          name: "ntpServer",
          label: t("network.ntpServer.label"),
        },
      ],
    },
    {
      label: t("network.rsyslogConfigSettings.label"),
      description: t("network.rsyslogConfigSettings.description"),
      fields: [
        {
          type: "text",
          name: "rsyslogServer",
          label: t("network.rsyslogServer.label"),
        },
      ],
    },
  ];

  return (
    <ConfigFormFields
      form={form}
      fieldGroups={fieldGroups}
      isDisabledByField={isDisabledByField}
    />
  );
};
