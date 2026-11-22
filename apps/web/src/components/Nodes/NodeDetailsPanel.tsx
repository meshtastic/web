import { Uptime } from "@components/generic/Uptime.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { KeyValue, KeyValueList } from "@components/UI/KeyValue.tsx";
import { SectionHeader } from "@components/UI/SectionHeader.tsx";
import {
  formatCoordinates,
  formatPercent,
  openStreetMapUrl,
} from "@core/nodes/format.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { cn } from "@core/utils/cn.ts";
import { fromByteArray } from "base64-js";
import {
  ArrowLeftIcon,
  BellIcon,
  BellOffIcon,
  ChartLineIcon,
  MapIcon,
  MapPinnedIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  StarIcon,
  StarOffIcon,
  TrashIcon,
  WaypointsIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NodeRowAvatar } from "./NodeRowAvatar.tsx";
import type { NodeActions } from "./useNodeActions.ts";
import type { NodeLabels } from "./useNodeLabels.ts";

export interface NodeDetailsPanelProps {
  row: NodeRow;
  labels: NodeLabels;
  actions: NodeActions;
  /**
   * Shown on mobile, where the panel replaces the list. The node's name
   * takes focus when the panel opens there.
   */
  onBack?: () => void;
  /** The node reported an error (a public key mismatch, say). */
  hasError?: boolean;
  className?: string;
}

const Section = ({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) => {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-2 border-b border-subtle px-2 py-3 last:border-b-0",
        className,
      )}
    >
      <SectionHeader id={headingId} title={title} as="h3" />
      {children}
    </section>
  );
};

const ActionButton = ({
  icon,
  danger = false,
  onClick,
  children,
}: {
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button
    variant={danger ? "dangerGhost" : "outline"}
    className={cn("w-full justify-start text-help", danger && "border-0")}
    icon={icon}
    onClick={onClick}
  >
    {children}
  </Button>
);

const iconClass = "size-4";

/**
 * One node's details and every action on it: the Nodes screen's details
 * column, and the full-screen view on mobile.
 */
export const NodeDetailsPanel = ({
  row,
  labels,
  actions,
  onBack,
  hasError = false,
  className,
}: NodeDetailsPanelProps) => {
  const { t } = useTranslation("nodes");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const takesFocus = onBack !== undefined;

  // Replacing the list moves the user to a new view: start them at its name.
  useEffect(() => {
    if (takesFocus) {
      headingRef.current?.focus();
    }
  }, [takesFocus, row.num]);
  const { locale } = labels;
  const powerRows = [
    row.battery
      ? {
          key: "battery",
          label: t("column.battery"),
          value: labels.battery(row),
        }
      : undefined,
    row.voltage !== undefined
      ? {
          key: "voltage",
          label: t("details.voltage"),
          value: labels.voltage(row),
        }
      : undefined,
    row.channelUtilization !== undefined
      ? {
          key: "channelUtil",
          label: t("details.channelUtil"),
          value: formatPercent(row.channelUtilization, locale, 1),
        }
      : undefined,
    row.airUtilTx !== undefined
      ? {
          key: "airUtil",
          label: t("details.airUtil"),
          value: formatPercent(row.airUtilTx, locale, 1),
        }
      : undefined,
    row.uptimeSeconds !== undefined
      ? {
          key: "uptime",
          label: t("details.uptime"),
          value: <Uptime seconds={row.uptimeSeconds} />,
        }
      : undefined,
  ].filter((item) => item !== undefined);

  return (
    <div className={cn("flex flex-col", className)}>
      {onBack ? (
        <div className="px-1 pt-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon aria-hidden="true" className={iconClass} />}
            onClick={onBack}
          >
            {t("page.back")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-2 border-b border-subtle px-2 pt-6 pb-4 text-center">
        <NodeRowAvatar row={row} size="2xl" />
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-header-lg font-bold break-words outline-none"
        >
          {row.name}
        </h2>
        <p className="m-0 text-meta text-muted">{labels.summary(row)}</p>
        {row.status ? (
          <p className="m-0 text-help text-secondary break-words">
            <span className="sr-only">{t("details.status")}: </span>
            {row.status}
          </p>
        ) : null}
        {hasError ? (
          <Callout tone="danger" className="w-full text-left">
            {t("details.error")}
          </Callout>
        ) : null}
        <div className="mt-1.5 flex w-full gap-2">
          {row.isMessageable ? (
            <Button
              variant="primary"
              className="flex-1"
              icon={
                <MessageSquareIcon aria-hidden="true" className={iconClass} />
              }
              onClick={actions.message}
            >
              {t("details.message")}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            className="flex-1"
            disabled={!row.lngLat}
            icon={<MapIcon aria-hidden="true" className={iconClass} />}
            onClick={actions.showOnMap}
          >
            {t("details.showOnMap")}
          </Button>
        </div>
      </div>

      <Section title={t("details.signal")}>
        <KeyValueList className="grid grid-cols-3 gap-2">
          <KeyValue
            variant="tile"
            label={t("column.snr")}
            value={labels.snr(row)}
          />
          <KeyValue
            variant="tile"
            label={t("column.hops")}
            value={labels.hopsValue(row)}
          />
          <KeyValue
            variant="tile"
            label={t("column.distance")}
            value={labels.distance(row)}
          />
        </KeyValueList>
      </Section>

      <Section title={t("details.quickActions")} className="gap-1.5">
        {row.isSelf ? null : (
          <>
            <ActionButton
              icon={<WaypointsIcon aria-hidden="true" className={iconClass} />}
              onClick={actions.traceroute}
            >
              {t("details.traceroute")}
            </ActionButton>
            <ActionButton
              icon={<MapPinnedIcon aria-hidden="true" className={iconClass} />}
              onClick={actions.requestPosition}
            >
              {t("details.requestPosition")}
            </ActionButton>
            <ActionButton
              icon={
                row.isFavorite ? (
                  <StarOffIcon aria-hidden="true" className={iconClass} />
                ) : (
                  <StarIcon aria-hidden="true" className={iconClass} />
                )
              }
              onClick={actions.toggleFavorite}
            >
              {row.isFavorite
                ? t("details.removeFavorite")
                : t("details.addFavorite")}
            </ActionButton>
            {row.publicKey ? (
              <ActionButton
                icon={
                  <ShieldCheckIcon aria-hidden="true" className={iconClass} />
                }
                onClick={actions.verifyKey}
              >
                {t("details.verifyKey")}
              </ActionButton>
            ) : null}
          </>
        )}
        <ActionButton
          icon={<ChartLineIcon aria-hidden="true" className={iconClass} />}
          onClick={actions.openAllDetails}
        >
          {t("details.allDetails")}
        </ActionButton>
        {row.isSelf ? null : (
          <>
            <ActionButton
              danger
              icon={
                row.isIgnored ? (
                  <BellIcon aria-hidden="true" className={iconClass} />
                ) : (
                  <BellOffIcon aria-hidden="true" className={iconClass} />
                )
              }
              onClick={actions.toggleIgnored}
            >
              {row.isIgnored ? t("details.unignore") : t("details.ignore")}
            </ActionButton>
            <ActionButton
              danger
              icon={<TrashIcon aria-hidden="true" className={iconClass} />}
              onClick={actions.remove}
            >
              {t("details.remove")}
            </ActionButton>
          </>
        )}
      </Section>

      <Section title={t("details.about")}>
        <KeyValueList>
          <KeyValue label={t("details.nodeId")} value={row.id} mono />
          <KeyValue label={t("details.nodeNumber")} value={row.num} mono />
          <KeyValue
            label={t("column.role")}
            value={row.role ?? labels.notAvailable}
          />
          <KeyValue
            label={t("column.hardware")}
            value={row.hardware ?? labels.notAvailable}
          />
          <KeyValue
            label={t("column.lastHeard")}
            value={labels.lastHeard(row)}
          />
          {row.macAddress ? (
            <KeyValue label={t("details.mac")} value={row.macAddress} mono />
          ) : null}
          <KeyValue
            label={t("details.messageable")}
            value={row.isMessageable || row.isSelf ? t("yes") : t("no")}
          />
        </KeyValueList>
      </Section>

      {powerRows.length > 0 ? (
        <Section title={t("details.power")}>
          <KeyValueList>
            {powerRows.map((item) => (
              <KeyValue key={item.key} label={item.label} value={item.value} />
            ))}
          </KeyValueList>
        </Section>
      ) : null}

      <Section title={t("details.position")}>
        {row.lngLat ? (
          <KeyValueList>
            <KeyValue
              label={t("details.coordinates")}
              value={
                <a
                  href={openStreetMapUrl(row.lngLat)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-2 hover:text-accent-hover hover:underline"
                >
                  {formatCoordinates(row.lngLat, locale)}
                </a>
              }
            />
            {row.altitude !== undefined ? (
              <KeyValue
                label={t("details.altitude")}
                value={t("details.meters", { value: row.altitude })}
              />
            ) : null}
            {row.distanceMeters !== undefined ? (
              <KeyValue
                label={t("column.distance")}
                value={labels.distance(row)}
              />
            ) : null}
          </KeyValueList>
        ) : (
          <p className="m-0 text-help text-muted">{t("details.noPosition")}</p>
        )}
      </Section>

      <Section title={t("details.security")}>
        <KeyValueList>
          <KeyValue
            label={t("details.publicKey")}
            value={
              row.publicKey ? (
                <span className="break-all">
                  {fromByteArray(row.publicKey)}
                </span>
              ) : (
                t("details.noPublicKey")
              )
            }
            mono={row.publicKey !== undefined}
          />
          {row.publicKey ? (
            <KeyValue
              label={t("details.verifyKey")}
              value={
                row.isKeyManuallyVerified
                  ? t("details.keyVerified")
                  : t("details.keyNotVerified")
              }
            />
          ) : null}
        </KeyValueList>
        {row.hasXeddsaSigned ? (
          <p className="m-0 text-help text-secondary">{t("details.signed")}</p>
        ) : null}
        {row.unheardOnCurrentLora ? (
          <p className="m-0 text-help text-warning">{t("details.unheard")}</p>
        ) : null}
      </Section>
    </div>
  );
};
