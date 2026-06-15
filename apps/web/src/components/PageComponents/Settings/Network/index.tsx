import { useWaitForConfig } from "@app/core/hooks/useWaitForConfig";
import { type NetworkValidation, NetworkValidationSchema } from "@app/validation/config/network.ts";
import { create } from "@bufbuild/protobuf";
import { DynamicForm, type DynamicFormFormInit } from "@components/Form/DynamicForm.tsx";
import { useDevice } from "@core/stores";
import { convertIntToIpAddress, convertIpAddressToInt } from "@core/utils/ip.ts";
import { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";

interface NetworkConfigProps {
  onFormInit: DynamicFormFormInit<NetworkValidation>;
}

const EMPTY_RADIO_SIGNAL = {
  value: {} as { network?: Protobuf.Config.Config_NetworkConfig },
  peek: () => ({}) as { network?: Protobuf.Config.Config_NetworkConfig },
  subscribe: () => () => {},
} as const;

const toFormShape = (cfg: Protobuf.Config.Config_NetworkConfig | undefined) => ({
  ...cfg,
  ipv4Config: {
    ip: convertIntToIpAddress(cfg?.ipv4Config?.ip ?? 0),
    gateway: convertIntToIpAddress(cfg?.ipv4Config?.gateway ?? 0),
    subnet: convertIntToIpAddress(cfg?.ipv4Config?.subnet ?? 0),
    dns: convertIntToIpAddress(cfg?.ipv4Config?.dns ?? 0),
  },
  enabledProtocols:
    cfg?.enabledProtocols ?? Protobuf.Config.Config_NetworkConfig_ProtocolFlags.NO_BROADCAST,
});

export const Network = ({ onFormInit }: NetworkConfigProps) => {
  useWaitForConfig({ configCase: "network" });

  const { config, getEffectiveConfig } = useDevice();
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? EMPTY_RADIO_SIGNAL);
  const effective =
    radio.network ??
    (getEffectiveConfig("network") as Protobuf.Config.Config_NetworkConfig | undefined);

  const { t } = useTranslation("config");

  const onSubmit = (data: NetworkValidation) => {
    if (!editor) return;
    const payload = {
      ...data,
      ipv4Config: create(Protobuf.Config.Config_NetworkConfig_IpV4ConfigSchema, {
        ip: convertIpAddressToInt(data.ipv4Config?.ip ?? ""),
        gateway: convertIpAddressToInt(data.ipv4Config?.gateway ?? ""),
        subnet: convertIpAddressToInt(data.ipv4Config?.subnet ?? ""),
        dns: convertIpAddressToInt(data.ipv4Config?.dns ?? ""),
      }),
    };
    editor.setRadioSection("network", payload as unknown as Protobuf.Config.Config_NetworkConfig);
  };

  return (
    <DynamicForm<NetworkValidation>
      onSubmit={onSubmit}
      onFormInit={onFormInit}
      validationSchema={NetworkValidationSchema}
      defaultValues={toFormShape(config.network) as NetworkValidation}
      values={toFormShape(effective) as NetworkValidation}
      fieldGroups={[
        {
          label: t("network.wifiOptions.label"),
          description: t("network.wifiOptions.description"),
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
          label: t("network.ethernetOptionsCard.label"),
          description: t("network.ethernetOptionsCard.description"),
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
          label: t("network.advancedCard.label"),
          description: t("network.advancedCard.description"),
          fields: [
            {
              type: "text",
              name: "ntpServer",
              label: t("network.ntpServer.label"),
            },
            {
              type: "text",
              name: "rsyslogServer",
              label: t("network.rsyslogServer.label"),
            },
            {
              type: "select",
              name: "enabledProtocols",
              label: t("network.meshViaUdp.label"),
              description: t("network.meshViaUdp.description"),
              properties: {
                enumValue: Protobuf.Config.Config_NetworkConfig_ProtocolFlags,
                formatEnumName: true,
              },
            },
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
      ]}
    />
  );
};
