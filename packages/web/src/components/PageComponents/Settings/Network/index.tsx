import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import {
  type NetworkValidation,
  NetworkValidationSchema,
} from "@app/validation/config/network.ts";
import { create } from "@bufbuild/protobuf";
import {
  DynamicForm,
  type DynamicFormFormInit,
} from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { deepCompareConfig } from "@core/utils/deepCompareConfig.ts";
import {
  convertIntToIpAddress,
  convertIpAddressToInt,
} from "@core/utils/ip.ts";
import { Protobuf } from "@meshtastic/core";
import { useTranslation } from "react-i18next";

interface NetworkConfigProps {
  onFormInit: DynamicFormFormInit<NetworkValidation>;
}
export const Network = ({ onFormInit }: NetworkConfigProps) => {
  useWaitForConfig({ configCase: "network" });

  const { config, setChange, getEffectiveConfig, removeChange } = useDevice();
  const { t } = useTranslation("config");

  const networkConfig = getEffectiveConfig("network");

  const onSubmit = (data: NetworkValidation) => {
    const payload = {
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
    };

    if (deepCompareConfig(config.network, payload, true)) {
      removeChange({ type: "config", variant: "network" });
      return;
    }

    setChange({ type: "config", variant: "network" }, payload, config.network);
  };
  return (
    <DynamicForm<NetworkValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={NetworkValidationSchema}
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
        enabledProtocols:
          config.network?.enabledProtocols ??
          Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
      }}
      values={
        {
          ...networkConfig,
          ipv4Config: {
            ip: convertIntToIpAddress(networkConfig?.ipv4Config?.ip ?? 0),
            gateway: convertIntToIpAddress(
              networkConfig?.ipv4Config?.gateway ?? 0,
            ),
            subnet: convertIntToIpAddress(
              networkConfig?.ipv4Config?.subnet ?? 0,
            ),
            dns: convertIntToIpAddress(networkConfig?.ipv4Config?.dns ?? 0),
          },
          enabledProtocols:
            networkConfig?.enabledProtocols ??
            Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
        } as NetworkValidation
      }
      fieldGroups={[
        {
          label: t("network.title"),
          description: t("network.description"),
          notes: t("network.note"),
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
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
            {
              type: "password",
              name: "wifiPsk",
              label: t("network.psk.label"),
              description: t("network.psk.description"),
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
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
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
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
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
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
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
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
                  selector:
                    Protobuf.Config.Config_NetworkConfig_AddressMode.DHCP,
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
      ]}
    />
  );
};
