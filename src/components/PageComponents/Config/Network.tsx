import type { NetworkValidation } from "@app/validation/config/network.tsx";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";
import {
  convertIntToIpAddress,
  convertIpAddressToInt,
} from "@core/utils/ip.ts";
import { Protobuf } from "@meshtastic/js";

export const Network = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: NetworkValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "network",
          value: {
            ...data,
            ipv4Config: new Protobuf.Config.Config_NetworkConfig_IpV4Config({
              ip: convertIpAddressToInt(data.ipv4Config.ip) ?? 0,
              gateway: convertIpAddressToInt(data.ipv4Config.gateway) ?? 0,
              subnet: convertIpAddressToInt(data.ipv4Config.subnet) ?? 0,
              dns: convertIpAddressToInt(data.ipv4Config.dns) ?? 0,
            }),
          },
        },
      })
    );
  };

  return (
    <DynamicForm<NetworkValidation>
      onSubmit={onSubmit}
      defaultValues={{
        ...config.network,
        ipv4Config: {
          ip: convertIntToIpAddress(config.network?.ipv4Config?.ip ?? 0),
          gateway: convertIntToIpAddress(
            config.network?.ipv4Config?.gateway ?? 0
          ),
          subnet: convertIntToIpAddress(
            config.network?.ipv4Config?.subnet ?? 0
          ),
          dns: convertIntToIpAddress(config.network?.ipv4Config?.dns ?? 0),
        },
      }}
      fieldGroups={[
        {
          label: t("WiFi Config"),
          description: t("WiFi radio configuration"),
          fields: [
            {
              type: "toggle",
              name: "wifiEnabled",
              label: t("Enabled"),
              description: t("Enable or disable the WiFi radio"),
            },
            {
              type: "text",
              name: "wifiSsid",
              label: t("SSID"),
              description: t("Network name"),
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
            {
              type: "password",
              name: "wifiPsk",
              label: t("PSK"),
              description: t("Network password"),
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
          ],
        },
        {
          label: t("Ethernet Config"),
          description: t("Ethernet port configuration"),
          fields: [
            {
              type: "toggle",
              name: "ethEnabled",
              label: t("Enabled"),
              description: t("Enable or disable the Ethernet port"),
            },
          ],
        },
        {
          label: t("IP Config"),
          description: t("IP configuration"),
          fields: [
            {
              type: "select",
              name: "addressMode",
              label: t("Address Mode"),
              description: t("Address assignment selection"),
              properties: {
                enumValue: Protobuf.Config.Config_NetworkConfig_AddressMode,
              },
            },
            {
              type: "text",
              name: "ipv4Config.ip",
              label: t("IP"),
              description: t("IP Address"),
              disabledBy: [
                {
                  fieldName: "addressMode",
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
                },
              ],
            },
            {
              type: "text",
              name: "ipv4Config.gateway",
              label: t("Gateway"),
              description: t("Default Gateway"),
              disabledBy: [
                {
                  fieldName: "addressMode",
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
                },
              ],
            },
            {
              type: "text",
              name: "ipv4Config.subnet",
              label: t("Subnet"),
              description: t("Subnet Mask"),
              disabledBy: [
                {
                  fieldName: "addressMode",
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
                },
              ],
            },
            {
              type: "text",
              name: "ipv4Config.dns",
              label: t("DNS"),
              description: t("DNS Server"),
              disabledBy: [
                {
                  fieldName: "addressMode",
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
                },
              ],
            },
          ],
        },
        {
          label: t("NTP Config"),
          description: t("NTP configuration"),
          fields: [
            {
              type: "text",
              name: "ntpServer",
              label: t("NTP Server"),
            },
          ],
        },
        {
          label: t("Rsyslog Config"),
          description: t("Rsyslog configuration"),
          fields: [
            {
              type: "text",
              name: "rsyslogServer",
              label: t("Rsyslog Server"),
            },
          ],
        },
      ]}
    />
  );
};
