import { useNodeAsProto } from "@app/core/hooks/useNodesAsProto.ts";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { initialsFor, nodeDisplayName } from "@core/utils/nodeIdentity.ts";
import { LockKeyholeOpenIcon, StarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AvatarProps {
  nodeNum: number;
  size?: "sm" | "lg";
  className?: string;
  showError?: boolean;
  showFavorite?: boolean;
  /**
   * Leave the name out when it is shown next to the avatar, so it isn't
   * read twice. Favourite / lock status is still announced.
   */
  decorative?: boolean;
}

/**
 * Avatar for a node looked up by number. A thin wrapper over the
 * presentational NodeAvatar for existing callers.
 */
export const Avatar = ({
  nodeNum,
  size = "sm",
  showError = false,
  showFavorite = false,
  decorative = false,
  className,
}: AvatarProps) => {
  const { t } = useTranslation();
  const node = useNodeAsProto(nodeNum);

  if (!nodeNum) {
    return null;
  }

  const names = {
    shortName: node?.user?.shortName,
    longName: node?.user?.longName,
  };
  const favoriteText = t("nodeDetail.favorite.label", { ns: "nodes" });
  const errorText = t("nodeDetail.error.label", { ns: "nodes" });
  // Overlay icons are hidden inside the avatar; their meaning goes in text.
  const statuses = [
    showFavorite ? favoriteText : undefined,
    showError ? errorText : undefined,
  ].filter((status) => status !== undefined);
  const name = nodeDisplayName(names, nodeNum, (last4) =>
    t("fallbackName", { last4 }),
  );

  return (
    <>
      <NodeAvatar
        initials={initialsFor(names, nodeNum)}
        tone={{ kind: "node", nodeNum }}
        size={size === "lg" ? "xl" : "md"}
        label={decorative ? undefined : [name, ...statuses].join(", ")}
        className={className}
      >
        {showFavorite ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <StarIcon
                  className="absolute -top-0.5 -right-0.5 z-10 size-4 stroke-1 fill-dirty text-warning"
                  aria-hidden="true"
                />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>{favoriteText}</TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        ) : null}
        {showError ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <LockKeyholeOpenIcon
                  className="absolute -bottom-0.5 -right-0.5 z-10 size-4 stroke-3 text-danger-strong"
                  aria-hidden="true"
                />
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>{errorText}</TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </NodeAvatar>
      {decorative && statuses.length > 0 ? (
        <span className="sr-only">{statuses.join(", ")}</span>
      ) : null}
    </>
  );
};
