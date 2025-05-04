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

export const Network = () => {
  const { config, setWorkingConfig } = useDevice();

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
          label: "WiFi Config",
          description: "WiFi radio configuration",
          notes:
            "Note: Some devices (ESP32) cannot use both Bluetooth and WiFi at the same time.",
          fields: [
            {
              type: "toggle",
              name: "wifiEnabled",
              label: "Enabled",
              description: "Enable or disable the WiFi radio",
            },
            {
              type: "text",
              name: "wifiSsid",
              label: "SSID",
              description: "Network name",
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
            {
              type: "password",
              name: "wifiPsk",
              label: "PSK",
              description: "Network password",
              disabledBy: [
                {
                  fieldName: "wifiEnabled",
                },
              ],
            },
          ],
        },
        {
          label: "Ethernet Config",
          description: "Ethernet port configuration",
          fields: [
            {
              type: "toggle",
              name: "ethEnabled",
              label: "Enabled",
              description: "Enable or disable the Ethernet port",
            },
          ],
        },
        {
          label: "IP Config",
          description: "IP configuration",
          fields: [
            {
              type: "select",
              name: "addressMode",
              label: "Address Mode",
              description: "Address assignment selection",
              properties: {
                enumValue: Protobuf.Config.Config_NetworkConfig_AddressMode,
              },
            },
            {
              type: "text",
              name: "ipv4Config.ip",
              label: "IP",
              description: "IP Address",
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
              label: "Gateway",
              description: "Default Gateway",
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
              label: "Subnet",
              description: "Subnet Mask",
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
              label: "DNS",
              description: "DNS Server",
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
          label: "UDP Config",
          description: "UDP over Mesh configuration",
          fields: [
            {
              type: "select",
              name: "enabledProtocols",
              label: "Mesh via UDP",
              properties: {
                enumValue: Protobuf.Config.Config_NetworkConfig_ProtocolFlags,
                formatEnumName: true,
              },
            },
          ],
        },
        {
          label: "NTP Config",
          description: "NTP configuration",
          fields: [
            {
              type: "text",
              name: "ntpServer",
              label: "NTP Server",
            },
          ],
        },
        {
          label: "Rsyslog Config",
          description: "Rsyslog configuration",
          fields: [
            {
              type: "text",
              name: "rsyslogServer",
              label: "Rsyslog Server",
            },
          ],
        },
      ]}
    />
  );
};
