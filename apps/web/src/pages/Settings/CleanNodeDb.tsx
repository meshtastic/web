import {
  SettingsBlock,
  SettingsGroup,
  SettingsRow,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { useDeviceConnected } from "@components/PageComponents/SettingsPages/useDeviceConnected.ts";
import { Callout } from "@components/UI/Callout.tsx";
import { ConfirmDialog } from "@components/UI/ConfirmDialog.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { Slider } from "@components/UI/Slider.tsx";
import { Switch } from "@components/UI/Switch.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  MAX_DAYS,
  MIN_DAYS_KNOWN,
  minDays,
  nodesToClean,
} from "@core/utils/cleanNodes.ts";
import type { Node } from "@core/storage/types.ts";
import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConfigProps } from "./sectionProps.ts";
import { useActiveClient, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";

const EMPTY_NODES_SIGNAL = constantSignal<ReadonlyArray<Node>>([]);
const EMPTY_NUM_SIGNAL = constantSignal<number | undefined>(undefined);

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
    setConfirmOpen(false);
    toast({
      title: t("settingsPages.cleanNodes.done", { count: removed }),
      description:
        failed > 0
          ? t("settingsPages.cleanNodes.failed", { count: failed })
          : undefined,
    });
  };

  return (
    <>
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
              className="w-full sm:w-60"
              value={[olderThanDays]}
              min={minDays(onlyUnknown)}
              max={MAX_DAYS}
              onValueChange={([days]) => {
                if (days !== undefined) setOlderThanDays(days);
              }}
            />
            <span className="w-12 text-right text-help tabular-nums">
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
          tone="danger"
          title={t("settingsPages.cleanNodes.queued", { count: queued.length })}
        >
          <SettingsBlock>
            {queued.length === 0 ? (
              <p className="m-0 text-help text-muted">
                {t("settingsPages.cleanNodes.none")}
              </p>
            ) : (
              <ul className="m-0 flex max-h-64 list-none flex-wrap gap-2 overflow-y-auto p-0">
                {queued.map((node) => (
                  <li
                    key={node.num}
                    className="rounded-full bg-raised px-3 py-1 text-help text-secondary"
                  >
                    {nodeLabel(node)}
                  </li>
                ))}
              </ul>
            )}
            {!connected && (
              <Callout tone="warning">
                {t("settingsPages.notConnected")}
              </Callout>
            )}
          </SettingsBlock>
          <SettingRow
            kind="button"
            tone="danger"
            label={t("settingsPages.cleanNodes.confirmTitle")}
            help={t("settingsPages.cleanNodes.confirmDescription", {
              count: queued.length,
            })}
            actionLabel={t("settingsPages.cleanNodes.cleanNow")}
            disabled={!connected || cleaning || queued.length === 0}
            onAction={() => setConfirmOpen(true)}
          />
        </SettingsGroup>
      </SettingsSections>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          // Stays open until every removal has been answered.
          if (!cleaning) setConfirmOpen(open);
        }}
        tone="danger"
        title={t("settingsPages.cleanNodes.confirmTitle")}
        description={t("settingsPages.cleanNodes.confirmDescription", {
          count: queued.length,
        })}
        confirmLabel={
          cleaning
            ? t("settingsLayout.working", { ns: "config" })
            : t("settingsPages.cleanNodes.cleanNow")
        }
        pending={cleaning}
        onConfirm={() => void cleanNow()}
      />
    </>
  );
};
