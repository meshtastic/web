import type { NetworkValidation } from "@app/validation/config/network.js";
import { DynamicForm } from "@components/Form/DynamicForm.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/js";

export const Network = (): JSX.Element => {
  const { config, setWorkingConfig } = useDevice();

  const onSubmit = (data: NetworkValidation) => {
    setWorkingConfig(
      new Protobuf.Config.Config({
        payloadVariant: {
          case: "network",
          value: {
            ...data,
            ipv4Config: new Protobuf.Config.Config_NetworkConfig_IpV4Config(
              data.ipv4Config,
            ),
          },
        },
      }),
    );
  };

  return (
    <DynamicForm<NetworkValidation>
      onSubmit={onSubmit}
      defaultValues={config.network}
      fieldGroups={[
        {
          label: "WiFi Config",
          description: "WiFi radio configuration",
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
