import type {
  DeviceSource,
  NodeSource,
  RegistryInput,
} from "@core/commandMenu/sources.ts";
import { nodeName } from "@core/commandMenu/sources.ts";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useChannels, useUnreadByKey } from "@core/kmp/hooks";
import { Protobuf } from "@core/protobuf.ts";
import { useDeviceStore } from "@core/stores";
import { isModuleExcluded } from "@core/utils/excludedModules.ts";
import { visibleDeviceTabs } from "@pages/Settings/DeviceConfig.tsx";
import { MODULE_TABS } from "@pages/Settings/ModuleConfig.tsx";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Reads everything the command registry needs into plain values. Each part
 * is memoised on its own source, and the result only changes when one of
 * them does, so the registry is rebuilt on data changes, not keystrokes.
 * Mount it only while the menu is open.
 */
export function useRegistryInput(now: number): RegistryInput {
  const { t, i18n } = useTranslation("commandPalette");
  const channelList = useChannels();
  const unreadByKey = useUnreadByKey();
  const protoNodes = useNodesAsProto();
  const myNode = useMyNodeAsProto();
  // Immer replaces the map on every device change.
  const deviceMap = useDeviceStore((s) => s.devices);
  const { metadata, excludedModules } = useDeviceCapabilities();

  const nodes = useMemo(
    (): NodeSource[] =>
      protoNodes.map((node) => ({
        num: node.num,
        longName: node.user?.longName,
        shortName: node.user?.shortName,
        hopsAway: node.hopsAway,
        lastHeard: node.lastHeard,
        isFavorite: node.isFavorite,
      })),
    [protoNodes],
  );

  const channels = useMemo(
    () =>
      channelList.map((channel) => ({
        index: channel.index,
        name: channel.settings?.name,
        disabled: channel.role === Protobuf.Channel.Channel_Role.DISABLED,
      })),
    [channelList],
  );

  const myNodeNum = myNode?.num;

  const devices = useMemo((): DeviceSource[] => {
    const nameFor = (nodeNum: number): string => {
      const node = nodes.find((candidate) => candidate.num === nodeNum);
      return node ? nodeName(node, t) : t("unknown.longName");
    };
    return Array.from(deviceMap.values(), (device) => ({
      id: device.id,
      name: nameFor(device.hardware.myNodeNum),
    }));
  }, [deviceMap, nodes, t]);

  const deviceName = useMemo(() => {
    const node = nodes.find((candidate) => candidate.num === myNodeNum);
    return node ? nodeName(node, t) : undefined;
  }, [nodes, myNodeNum, t]);

  const deviceTabs = useMemo(() => visibleDeviceTabs(metadata), [metadata]);
  const moduleTabs = useMemo(
    () =>
      MODULE_TABS.filter((tab) => !isModuleExcluded(excludedModules, tab.key)),
    [excludedModules],
  );

  return useMemo(
    (): RegistryInput => ({
      t,
      locale: i18n.language,
      now,
      channels,
      nodes,
      unreadByKey,
      myNodeNum,
      deviceName,
      devices,
      deviceTabs,
      moduleTabs,
    }),
    [
      t,
      i18n.language,
      now,
      channels,
      nodes,
      unreadByKey,
      myNodeNum,
      deviceName,
      devices,
      deviceTabs,
      moduleTabs,
    ],
  );
}
