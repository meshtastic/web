import { IconButton } from "@components/UI/IconButton.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { SectionHeader } from "@components/UI/SectionHeader.tsx";
import { cn } from "@core/utils/cn.ts";
import { LoaderCircleIcon, PlusIcon, XIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type DeviceListEntry,
  type DeviceMenuActionId,
  type DeviceSummary,
  deviceMenuActions,
  isInProgress,
  presenceForState,
} from "./deviceSummary.ts";
import { useDeviceMenu } from "./useDeviceMenu.ts";
import {
  deviceMenuActionLabels,
  stateLabelKeys,
  transportLabelKeys,
} from "./shellLabels.ts";

interface StatTileProps {
  label: string;
  value: string;
  detail?: ReactNode;
}

const StatTile = ({ label, value, detail }: StatTileProps) => (
  <div className="flex flex-col gap-0.5 rounded-control bg-chat px-3 py-2.5">
    <span className="text-meta text-muted">{label}</span>
    <span className="font-semibold">{value}</span>
    {detail}
  </div>
);

export interface DeviceMenuPanelProps {
  summary: DeviceSummary;
  devices: readonly DeviceListEntry[];
  titleId: string;
  onAction: (action: DeviceMenuActionId) => void;
  onSelectDevice: (deviceId: number) => void;
  onConnectAnother: () => void;
}

/** Device panel contents (header, stats, actions, device list). */
export const DeviceMenuPanel = ({
  summary,
  devices,
  titleId,
  onAction,
  onSelectDevice,
  onConnectAnother,
}: DeviceMenuPanelProps) => {
  const { t } = useTranslation("ui");
  const transport = summary.transport
    ? t(transportLabelKeys[summary.transport])
    : undefined;
  const status = (
    summary.connected && transport
      ? [t("shell.connectedVia", { transport }), summary.target]
      : [t(stateLabelKeys[summary.state]), transport]
  )
    .filter(Boolean)
    .join(" · ");
  const power =
    summary.power?.kind === "pluggedIn"
      ? t("batteryStatus.pluggedIn")
      : summary.power
        ? t("shell.batteryLevel", { level: summary.power.level })
        : undefined;
  const voltage = summary.voltage
    ? t("shell.volts", { value: summary.voltage })
    : undefined;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-subtle p-4">
        <NodeAvatar
          initials={summary.initials}
          tone={{ kind: "device" }}
          size="lg"
          presence={presenceForState[summary.state]}
          presenceLabel={null}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id={titleId} className="m-0 truncate text-header-lg font-bold">
            {summary.name}
          </h2>
          <output className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
            {isInProgress(summary.state) ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 animate-spin"
              />
            ) : null}
            <span className="truncate">{status}</span>
          </output>
        </div>
        <PopoverClose asChild>
          <IconButton
            aria-label={t("button.close", { ns: "common" })}
            icon={<XIcon className="size-5" />}
          />
        </PopoverClose>
      </div>

      {power ||
      voltage ||
      summary.firmware ||
      summary.channelUtilization ||
      summary.airUtilTx ? (
        <div className="grid grid-cols-2 gap-2 px-4 py-3.5">
          {power || voltage ? (
            <StatTile
              label={t("shell.power")}
              value={power ?? voltage ?? ""}
              detail={
                power && voltage ? (
                  <span className="text-meta text-muted">{voltage}</span>
                ) : undefined
              }
            />
          ) : null}
          {summary.firmware ? (
            <StatTile
              label={t("sidebar.deviceInfo.firmware.title")}
              value={summary.firmware.version}
              detail={
                summary.firmware.build ? (
                  <span className="font-mono text-meta text-muted">
                    {summary.firmware.build}
                  </span>
                ) : undefined
              }
            />
          ) : null}
          {summary.channelUtilization ? (
            <StatTile
              label={t("shell.channelUtilization")}
              value={t("shell.percent", { value: summary.channelUtilization })}
            />
          ) : null}
          {summary.airUtilTx ? (
            <StatTile
              label={t("shell.airUtilTx")}
              value={t("shell.percent", { value: summary.airUtilTx })}
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col px-2 pt-1 pb-2">
        {deviceMenuActions(summary.connected).map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            className={cn(
              "flex h-11 cursor-pointer items-center gap-3 rounded-control px-2.5 text-left text-body font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
              action.tone === "danger"
                ? "text-danger hover:bg-danger"
                : "text-primary hover:bg-raised",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                action.tone === "danger" ? "bg-danger-strong" : "bg-muted-dot",
              )}
            />
            {t(deviceMenuActionLabels[action.id].key, {
              ns: deviceMenuActionLabels[action.id].ns,
            })}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-subtle px-4 pt-3 pb-4">
        <SectionHeader as="h3" title={t("shell.devices")} />
        {devices.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {devices.map((device) => (
              <li key={device.id}>
                <button
                  type="button"
                  aria-current={device.active || undefined}
                  aria-label={
                    device.active
                      ? undefined
                      : t("shell.switchToDevice", { name: device.name })
                  }
                  onClick={() => onSelectDevice(device.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-control p-2 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                    device.active ? "bg-selected" : "hover:bg-raised",
                  )}
                >
                  <NodeAvatar
                    initials={device.initials}
                    tone={{ kind: "device" }}
                    size="xs"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {device.name}
                  </span>
                  {device.active ? (
                    <span className="text-meta text-accent">
                      {t("shell.activeDevice")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={onConnectAnother}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-input text-body font-medium text-primary transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {t("shell.connectAnother")}
        </button>
        <span className="text-meta text-muted">
          {t("shell.connectAnotherHint")}
        </span>
      </div>
    </div>
  );
};

export interface DeviceMenuProps {
  /** The trigger; receives the popover's open/close props. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

interface DeviceMenuBodyProps {
  titleId: string;
  close: () => void;
}

/** Rendered only while open, so closed menus don't subscribe to device data. */
const DeviceMenuBody = ({ titleId, close }: DeviceMenuBodyProps) => {
  const menu = useDeviceMenu();
  return (
    <DeviceMenuPanel
      summary={menu.summary}
      devices={menu.devices}
      titleId={titleId}
      onAction={(action) => {
        close();
        menu.runAction(action);
      }}
      onSelectDevice={(deviceId) => {
        close();
        menu.selectDevice(deviceId);
      }}
      onConnectAnother={() => {
        close();
        menu.connectAnother();
      }}
    />
  );
};

/** Device popover, opened from the rail avatar or the device card. */
export const DeviceMenu = ({
  children,
  side = "right",
  align = "start",
}: DeviceMenuProps) => {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={8}
        aria-labelledby={titleId}
        className="w-[340px] max-w-[calc(100vw-16px)] overflow-hidden p-0"
      >
        <DeviceMenuBody titleId={titleId} close={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
};
