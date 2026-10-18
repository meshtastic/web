import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { useDeviceConnected } from "@components/PageComponents/SettingsPages/useDeviceConnected.ts";
import { Button } from "@components/UI/Button.tsx";
import { Slider } from "@components/UI/Slider.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  MAX_DAYS,
  MIN_DAYS_KNOWN,
  minDays,
  nodesToClean,
} from "@core/utils/cleanNodes.ts";
import type { Node } from "@meshtastic/sdk";
import { useActiveClient, useSignal } from "@meshtastic/sdk-react";
import { EraserIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, SettingsCard } from "./SettingsTabs.tsx";

const EMPTY_NODES: ReadonlyArray<Node> = [];
const EMPTY_NODES_SIGNAL = {
  value: EMPTY_NODES,
  peek: () => EMPTY_NODES,
  subscribe: () => () => {},
} as const;
const EMPTY_NUM_SIGNAL = {
  value: undefined as number | undefined,
  peek: () => undefined as number | undefined,
  subscribe: () => () => {},
} as const;

const nodeLabel = (node: Node) =>
  node.user?.longName ||
  node.user?.shortName ||
  `!${(node.num >>> 0).toString(16).padStart(8, "0")}`;

/** Android's Clean node database screen. */
export const CleanNodeDb = (_props: ConfigProps) => {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const client = useActiveClient();
  const nodes = useSignal(client?.nodes.list ?? EMPTY_NODES_SIGNAL);
  const myNodeNum = useSignal(client?.device.myNodeNum ?? EMPTY_NUM_SIGNAL);
  const connected = useDeviceConnected();
  const switchId = useId();
  const sliderId = useId();

  const [olderThanDays, setOlderThanDays] = useState(30);
  const [onlyUnknown, setOnlyUnknown] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  // The cut-off is relative to when the page was opened.
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const queued = useMemo(
    () =>
      nodesToClean(nodes, {
        olderThanDays,
        onlyUnknown,
        nowSeconds,
        myNodeNum,
      }),
    [nodes, olderThanDays, onlyUnknown, myNodeNum, nowSeconds],
  );

  const onOnlyUnknownChange = (checked: boolean) => {
    setOnlyUnknown(checked);
    if (!checked) setOlderThanDays((days) => Math.max(days, MIN_DAYS_KNOWN));
  };

  const cleanNow = async () => {
    if (!client) return;
    setCleaning(true);
    let removed = 0;
    let failed = 0;
    // One at a time: each removal is an admin message to the node.
    for (const node of queued) {
      const result = await client.nodes.remove(node.num);
      if (result.isOk()) removed++;
      else failed++;
    }
    setCleaning(false);
    toast({
      title: t("settingsPages.cleanNodes.done", { count: removed }),
      description:
        failed > 0
          ? t("settingsPages.cleanNodes.failed", { count: failed })
          : undefined,
    });
  };

  return (
    <SettingsCard>
      <SettingsSections>
        <SettingsGroup
          title={t("settingsPages.cleanNodes.title")}
          description={t("settingsPages.cleanNodes.description")}
        >
          <SettingsRow
            label={t("settingsPages.cleanNodes.olderThan", {
              count: olderThanDays,
            })}
            htmlFor={sliderId}
            description={t("settingsPages.cleanNodes.olderThanDescription")}
          >
            <Slider
              id={sliderId}
              className="w-full max-w-md"
              value={[olderThanDays]}
              min={minDays(onlyUnknown)}
              max={MAX_DAYS}
              onValueChange={([days]) => {
                if (days !== undefined) setOlderThanDays(days);
              }}
            />
            <span className="w-12 text-right text-sm tabular-nums">
              {olderThanDays}
            </span>
          </SettingsRow>
          <SettingsRow
            label={t("settingsPages.cleanNodes.onlyUnknown")}
            htmlFor={switchId}
            description={t("settingsPages.cleanNodes.onlyUnknownDescription")}
          >
            <Switch
              id={switchId}
              checked={onlyUnknown}
              onCheckedChange={onOnlyUnknownChange}
            />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup
          title={t("settingsPages.cleanNodes.queued", { count: queued.length })}
        >
          {queued.length === 0 ? (
            <Subtle>{t("settingsPages.cleanNodes.none")}</Subtle>
          ) : (
            <ul className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
              {queued.map((node) => (
                <li
                  key={node.num}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-700"
                >
                  {nodeLabel(node)}
                </li>
              ))}
            </ul>
          )}
          {!connected && (
            <Subtle className="font-semibold">
              {t("settingsPages.notConnected")}
            </Subtle>
          )}
          <Button
            variant="destructive"
            disabled={!connected || cleaning || queued.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            <EraserIcon className="mr-2 size-4" />
            {t("settingsPages.cleanNodes.cleanNow")}
          </Button>
        </SettingsGroup>
      </SettingsSections>

      <DialogWrapper
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        type="confirm"
        variant="destructive"
        title={t("settingsPages.cleanNodes.confirmTitle")}
        description={t("settingsPages.cleanNodes.confirmDescription", {
          count: queued.length,
        })}
        confirmText={t("settingsPages.cleanNodes.cleanNow")}
        onConfirm={() => void cleanNow()}
      />
    </SettingsCard>
  );
};
