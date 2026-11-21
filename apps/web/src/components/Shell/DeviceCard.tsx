import { IconButton } from "@components/UI/IconButton.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { ChevronsUpDownIcon, LoaderCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DeviceMenu } from "./DeviceMenu.tsx";
import {
  type DeviceCardFact,
  deviceCardFacts,
  isInProgress,
  presenceForState,
} from "./deviceSummary.ts";
import { stateLabelKeys, transportLabelKeys } from "./shellLabels.ts";
import { useDeviceSummary } from "./useDeviceSummary.ts";

/** Connected radio summary pinned to the bottom of a page sidebar. */
export const DeviceCard = () => {
  const { t } = useTranslation("ui");
  const summary = useDeviceSummary();

  const factText = (fact: DeviceCardFact): string => {
    switch (fact.kind) {
      case "state":
        return t(stateLabelKeys[fact.state]);
      case "transport":
        return t(transportLabelKeys[fact.transport]);
      case "voltage":
        return t("shell.volts", { value: fact.value });
      case "firmware":
        return t("shell.firmwareShort", { version: fact.version });
    }
  };
  const facts = deviceCardFacts(summary).map(factText).join(" · ");

  return (
    <div className="m-2 flex items-center gap-2.5 rounded-card border border-subtle bg-app p-2.5">
      <NodeAvatar
        initials={summary.initials}
        tone={{ kind: "device" }}
        size="sm"
        presence={presenceForState[summary.state]}
        // Other states are spelled out in the subtitle.
        presenceLabel={summary.connected ? t(stateLabelKeys.connected) : null}
        cutout="app"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-help font-semibold">{summary.name}</span>
        {facts ? (
          <span className="flex min-w-0 items-center gap-1 text-meta text-muted">
            {isInProgress(summary.state) ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="size-3 shrink-0 animate-spin"
              />
            ) : null}
            <span className="truncate">{facts}</span>
          </span>
        ) : null}
      </div>
      <DeviceMenu side="top" align="end">
        <IconButton
          aria-label={t("shell.deviceDetails")}
          icon={<ChevronsUpDownIcon className="size-[18px]" />}
          size="sm"
        />
      </DeviceMenu>
    </div>
  );
};
