import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { cn } from "@core/utils/cn.ts";
import type { Protobuf } from "@core/protobuf.ts";
import type { LucideIcon } from "lucide-react";
import { RadioTowerIcon, SignatureIcon, VolumeXIcon } from "lucide-react";
import { createContext, type ReactNode, useContext } from "react";
import { useTranslation } from "react-i18next";

/** True below a `TrustTooltipProvider`; icons then reuse its provider. */
const SharedProvider = createContext(false);

/**
 * One tooltip provider for many indicator icons, e.g. above a long table,
 * instead of one per icon. Icons outside it still bring their own.
 */
export const TrustTooltipProvider = ({ children }: { children: ReactNode }) => (
  <TooltipProvider delayDuration={300}>
    <SharedProvider.Provider value={true}>{children}</SharedProvider.Provider>
  </TooltipProvider>
);

type TrustNode = Pick<
  Protobuf.Mesh.NodeInfo,
  "num" | "isMuted" | "hasXeddsaSigned" | "heardOnCurrentLora" | "viaMqtt"
>;

/**
 * True for a node the radio hasn't heard on its current LoRa settings.
 * Nodes seen only over MQTT are never "unheard": LoRa settings don't apply.
 * Firmware older than 2.8.1 doesn't report it, so every node counts as heard.
 */
export const isNodeUnheardOnCurrentLora = (node: TrustNode): boolean =>
  node.heardOnCurrentLora === false && !node.viaMqtt;

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
}: IndicatorProps) => {
  const shared = useContext(SharedProvider);
  const tip = (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A button so keyboard users can focus it to read the tooltip. */}
        <button
          type="button"
          aria-label={label}
          className="inline-flex shrink-0 cursor-default rounded-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Icon size={size} className={className} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
  return shared ? (
    tip
  ) : (
    <TooltipProvider delayDuration={300}>{tip}</TooltipProvider>
  );
};

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
          className="text-accent"
        />
      )}
      {unheard && (
        <IndicatorIcon
          icon={RadioTowerIcon}
          size={size}
          label={t("trust.unheard.label")}
          tooltip={t("trust.unheard.tooltip")}
          className="text-warning"
        />
      )}
      {node.isMuted && (
        <IndicatorIcon
          icon={VolumeXIcon}
          size={size}
          label={t("trust.muted.label")}
          tooltip={t("trust.muted.tooltip")}
          className="text-muted"
        />
      )}
    </span>
  );
};
