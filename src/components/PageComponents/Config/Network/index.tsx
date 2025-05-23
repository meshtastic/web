import {
  type NetworkValidation,
  NetworkValidationSchema,
} from "@app/validation/config/network.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import {
  convertIntToIpAddress,
  convertIpAddressToInt,
} from "@core/utils/ip.ts";
import { Protobuf } from "@meshtastic/core";
import { validateSchema } from "@app/validation/validate.ts";
import { useTranslation } from "react-i18next";

export const Network = () => {
  const { config, setWorkingConfig } = useDevice();
  const { t } = useTranslation();

  const onSubmit = (data: NetworkValidation) => {
    const result = validateSchema(NetworkValidationSchema, data);

    if (!result.success) {
      console.error("Validation errors:", result.errors);
    }

    setWorkingConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "network",
          value: {
            ...data,
            ipv4Config: create(
              Protobuf.Config.Config_NetworkConfig_IpV4ConfigSchema,
              {
                ip: convertIpAddressToInt(data.ipv4Config?.ip ?? ""),
                gateway: convertIpAddressToInt(data.ipv4Config?.gateway ?? ""),
                subnet: convertIpAddressToInt(data.ipv4Config?.subnet ?? ""),
                dns: convertIpAddressToInt(data.ipv4Config?.dns ?? ""),
              },
            ),
          },
        },
      }),
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
            config.network?.ipv4Config?.gateway ?? 0,
          ),
          subnet: convertIntToIpAddress(
            config.network?.ipv4Config?.subnet ?? 0,
          ),
          dns: convertIntToIpAddress(config.network?.ipv4Config?.dns ?? 0),
        },
        enabledProtocols: config.network?.enabledProtocols ??
          Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
      }}
      fieldGroups={[
        {
          label: t("config_network_groupLabel_wifiConfig"),
          description: t("config_network_groupDescription_wifiConfig"),
          notes: t("config_network_groupNotes_wifiBluetoothNote"),
          fields: [
            {
              type: "toggle",
              name: "wifiEnabled",
              label: t("config_network_fieldLabel_wifiEnabled"),
              description: t("config_network_fieldDescription_wifiEnabled"),
            },
            {
              type: "text",
              name: "wifiSsid",
              label: t("config_network_fieldLabel_ssid"),
              description: t("config_network_fieldDescription_ssid"),
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
            {
              type: "password",
              name: "wifiPsk",
              label: t("config_network_fieldLabel_psk"),
              description: t("config_network_fieldDescription_psk"),
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
          ],
        },
        {
          label: t("config_network_groupLabel_ethernetConfig"),
          description: t("config_network_groupDescription_ethernetConfig"),
          fields: [
            {
              type: "toggle",
              name: "ethEnabled",
              label: t("config_network_fieldLabel_ethernetEnabled"),
              description: t("config_network_fieldDescription_ethernetEnabled"),
            },
          ],
        },
        {
          label: t("config_network_groupLabel_ipConfig"),
          description: t("config_network_groupDescription_ipConfig"),
          fields: [
            {
              type: "select",
              name: "addressMode",
              label: t("config_network_fieldLabel_addressMode"),
              description: t("config_network_fieldDescription_addressMode"),
              properties: {
                enumValue: Protobuf.Config.Config_NetworkConfig_AddressMode,
              },
            },
            {
              type: "text",
              name: "ipv4Config.ip",
              label: t("config_network_fieldLabel_ip"),
              description: t("config_network_fieldDescription_ip"),
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
              label: t("config_network_fieldLabel_gateway"),
              description: t("config_network_fieldDescription_gateway"),
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
              label: t("config_network_fieldLabel_subnet"),
              description: t("config_network_fieldDescription_subnet"),
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
              label: t("config_network_fieldLabel_dns"),
              description: t("config_network_fieldDescription_dns"),
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
          label: t("config_network_groupLabel_udpConfig"),
          description: t("config_network_groupDescription_udpConfig"),
          fields: [
            {
              type: "select",
              name: "enabledProtocols",
              label: t("config_network_fieldLabel_meshViaUdp"),
              properties: {
                enumValue: Protobuf.Config.Config_NetworkConfig_ProtocolFlags,
                formatEnumName: true,
              },
            },
          ],
        },
        {
          label: t("config_network_groupLabel_ntpConfig"),
          description: t("config_network_groupDescription_ntpConfig"),
          fields: [
            {
              type: "text",
              name: "ntpServer",
              label: t("config_network_fieldLabel_ntpServer"),
            },
          ],
        },
        {
          label: t("config_network_groupLabel_rsyslogConfig"),
          description: t("config_network_groupDescription_rsyslogConfig"),
          fields: [
            {
              type: "text",
              name: "rsyslogServer",
              label: t("config_network_fieldLabel_rsyslogServer"),
            },
          ],
        },
      ]}
    />
  );
};
