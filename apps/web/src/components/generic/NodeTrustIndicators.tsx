import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { cn } from "@core/utils/cn.ts";
import { isUnheardOnCurrentLora, type Protobuf } from "@meshtastic/sdk";
import type { LucideIcon } from "lucide-react";
import { RadioTowerIcon, SignatureIcon, VolumeXIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

type TrustNode = Pick<
  Protobuf.Mesh.NodeInfo,
  "num" | "isMuted" | "hasXeddsaSigned" | "heardOnCurrentLora" | "viaMqtt"
>;

/**
 * True for a node the radio hasn't heard on its current LoRa settings.
 * Wraps the SDK helper so it accepts the proto NodeInfo the web uses.
 */
export const isNodeUnheardOnCurrentLora = (node: TrustNode): boolean =>
  isUnheardOnCurrentLora({
    num: node.num,
    isFavorite: false,
    isIgnored: false,
    heardOnCurrentLora: node.heardOnCurrentLora,
    viaMqtt: node.viaMqtt,
  });

interface IndicatorProps {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  className?: string;
  size: number;
}

export const IndicatorIcon = ({
  icon: Icon,
  label,
  tooltip,
  className,
  size,
}: IndicatorProps) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A button so keyboard users can focus it to read the tooltip. */}
        <button
          type="button"
          aria-label={label}
          className="inline-flex shrink-0 cursor-default rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <Icon size={size} className={className} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-slate-800 dark:bg-slate-600 text-white px-3 py-1 rounded text-xs whitespace-normal">
        {tooltip}
        <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export interface NodeTrustIndicatorsProps {
  node: TrustNode;
  size?: number;
  className?: string;
}

/**
 * Inline icons for a node's 2.8 trust signals: it signs its packets, it
 * hasn't been heard on the current LoRa settings, and it is muted. Renders
 * nothing when none apply.
 */
export const NodeTrustIndicators = ({
  node,
  size = 14,
  className,
}: NodeTrustIndicatorsProps) => {
  const { t } = useTranslation("nodes");
  const unheard = isNodeUnheardOnCurrentLora(node);

  if (!node.hasXeddsaSigned && !unheard && !node.isMuted) {
    return null;
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {node.hasXeddsaSigned && (
        <IndicatorIcon
          icon={SignatureIcon}
          size={size}
          label={t("trust.signed.label")}
          tooltip={t("trust.signed.tooltip")}
          className="text-green-600 dark:text-green-500"
        />
      )}
      {unheard && (
        <IndicatorIcon
          icon={RadioTowerIcon}
          size={size}
          label={t("trust.unheard.label")}
          tooltip={t("trust.unheard.tooltip")}
          className="text-amber-600 dark:text-amber-400"
        />
      )}
      {node.isMuted && (
        <IndicatorIcon
          icon={VolumeXIcon}
          size={size}
          label={t("trust.muted.label")}
          tooltip={t("trust.muted.tooltip")}
          className="text-slate-500 dark:text-slate-400"
        />
      )}
    </span>
  );
};
