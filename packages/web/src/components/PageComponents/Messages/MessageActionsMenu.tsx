import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { cn } from "@core/utils/cn.ts";
import { Reply, SmilePlus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MessageActionsMenuProps {
  onAddReaction?: () => void;
  onReply?: () => void;
}

export const MessageActionsMenu = ({
  onAddReaction,
  onReply,
}: MessageActionsMenuProps) => {
  const { t } = useTranslation();
  const hoverIconBarClass = cn(
    "absolute top-2 right-2",
    "flex items-center gap-x-1",
    "bg-white dark:bg-zinc-800",
    "border border-gray-200 dark:border-zinc-600",
    "rounded-md shadow-sm p-1",
    "opacity-0 group-hover:opacity-100",
    "transition-opacity duration-100 ease-in-out",
    "z-10",
  );

  const hoverIconButtonClass = cn(
    "p-1 rounded",
    "text-gray-500 dark:text-gray-400",
    "hover:text-gray-700 dark:hover:text-gray-300",
    "hover:bg-gray-100 dark:hover:bg-zinc-700",
    "cursor-pointer",
  );

  const iconSizeClass = "size-4";

  return (
    <div className={cn(hoverIconBarClass)}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("messages_actionsMenu_addReactionLabel")}
              onClick={(e) => {
                e.stopPropagation();
                if (onAddReaction) {
                  onAddReaction();
                }
              }}
              className={hoverIconButtonClass}
            >
              <SmilePlus className={iconSizeClass} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 text-white px-2 py-1 rounded text-xs">
            {t("messages_actionsMenu_addReactionLabel")}
            <TooltipArrow className="fill-gray-800" />
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("messages_actionsMenu_replyLabel")}
              onClick={(e) => {
                e.stopPropagation();
                if (onReply) {
                  onReply();
                }
              }}
              className={hoverIconButtonClass}
            >
              <Reply className={iconSizeClass} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="bg-gray-800 text-white px-2 py-1 rounded text-xs">
            {t("messages_actionsMenu_replyLabel")}
            <TooltipArrow className="fill-gray-800" />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
