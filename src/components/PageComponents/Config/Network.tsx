import type { ConfigPreset } from "@app/core/stores/appStore";
import type { NetworkValidation } from "@app/validation/config/network.js";
import { DynamicForm, EnableSwitchData } from "@components/Form/DynamicForm.js";
import { useConfig, useDevice } from "@core/stores/deviceStore.js";
import { Protobuf } from "@meshtastic/meshtasticjs";

export const Network = (): JSX.Element => {
  const config = useConfig();
  const enableSwitch: EnableSwitchData | undefined = config.overrideValues
    ? {
        getEnabled(name) {
          return config.overrideValues![name] ?? false;
        },
        setEnabled(name, value) {
          config.overrideValues![name] = value;
        }
      }
    : undefined;
  const isPresetConfig = !("id" in config);
  const { setWorkingConfig } = !isPresetConfig
    ? useDevice()
    : { setWorkingConfig: undefined };
  const setConfig: (data: NetworkValidation) => void = isPresetConfig
    ? (data) => {
        config.config.network = new Protobuf.Config_NetworkConfig(data);
        (config as ConfigPreset).saveConfigTree();
      }
    : (data) => {
        setWorkingConfig!(
          new Protobuf.Config({
            payloadVariant: {
              case: "network",
              value: data
            }
          })
        );
      };

  const onSubmit = setConfig;

  return (
    <DynamicForm<NetworkValidation>
      onSubmit={onSubmit}
      defaultValues={config.config.network}
      enableSwitch={enableSwitch}
      fieldGroups={[
        {
          label: "WiFi Config",
          description: "WiFi radio configuration",
          fields: [
            {
              type: "toggle",
              name: "wifiEnabled",
              label: "Enabled",
              description: "Enable or disable the WiFi radio"
            },
            {
              type: "text",
              name: "wifiSsid",
              label: "SSID",
              description: "Network name"
            },
            {
              type: "password",
              name: "wifiPsk",
              label: "PSK",
              description: "Network password"
            }
          ]
        },
        {
          label: "Ethernet Config",
          description: "Ethernet port configuration",
          fields: [
            {
              type: "toggle",
              name: "ethEnabled",
              label: "Enabled",
              description: "Enable or disable the Ethernet port"
            }
          ]
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
                enumValue: Protobuf.Config_NetworkConfig_AddressMode
              }
            },
            {
              type: "text",
              name: "ipv4Config.ip",
              label: "IP",
              description: "IP Address"
            },
            {
              type: "text",
              name: "ipv4Config.gateway",
              label: "Gateway",
              description: "Default Gateway"
            },
            {
              type: "text",
              name: "ipv4Config.subnet",
              label: "Subnet",
              description: "Subnet Mask"
            },
            {
              type: "text",
              name: "ipv4Config.dns",
              label: "DNS",
              description: "DNS Server"
            }
          ]
        },
        {
          label: "NTP Config",
          description: "NTP configuration",
          fields: [
            {
              type: "text",
              name: "ntpServer",
              label: "NTP Server"
            }
          ]
        },
        {
          label: "Rsyslog Config",
          description: "Rsyslog configuration",
          fields: [
            {
              type: "text",
              name: "rsyslogServer",
              label: "Rsyslog Server"
            }
          ]
        }
      ]}
    />
  );
};
