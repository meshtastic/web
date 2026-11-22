import { EmptyState } from "@components/UI/EmptyState.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { Link } from "@tanstack/react-router";
import {
  CommandIcon,
  MessageSquareTextIcon,
  PencilLineIcon,
} from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface RecentNodeView {
  readonly num: number;
  readonly name: string;
  readonly initials: string;
}

export interface ChatsEmptyStateProps {
  /** "⌘K" or "Ctrl K". */
  shortcut: string;
  recent: readonly RecentNodeView[];
  onNewDirectMessage: () => void;
  onOpenSearch: () => void;
}

const cardClass =
  "flex cursor-pointer flex-col items-start gap-2 rounded-panel border border-subtle bg-surface p-4 text-left text-primary hover:border-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/**
 * Messages with no conversation open: three ways to start (new DM, add a
 * channel, the command menu) and shortcuts to recently heard nodes.
 */
export const ChatsEmptyState = ({
  shortcut,
  recent,
  onNewDirectMessage,
  onOpenSearch,
}: ChatsEmptyStateProps) => {
  const { t } = useTranslation("messages");
  const recentId = useId();
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-chat p-10">
      <EmptyState
        icon={
          <MessageSquareTextIcon className="size-[34px]" strokeWidth={1.8} />
        }
        title={t("chats.title")}
        description={t("chats.description")}
      >
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={onNewDirectMessage}
            className={cardClass}
          >
            <PencilLineIcon aria-hidden="true" className="size-5 text-accent" />
            <span className="font-semibold">{t("chats.newDmTitle")}</span>
            <span className="text-help text-muted">{t("chats.newDmHint")}</span>
          </button>
          <Link to="/settings/channels" className={cardClass}>
            <span
              aria-hidden="true"
              className="text-title leading-5 font-bold text-accent"
            >
              #
            </span>
            <span className="font-semibold">{t("chats.addChannelTitle")}</span>
            <span className="text-help text-muted">
              {t("chats.addChannelHint")}
            </span>
          </Link>
          <button type="button" onClick={onOpenSearch} className={cardClass}>
            <CommandIcon aria-hidden="true" className="size-5 text-accent" />
            <span className="font-semibold">{t("chats.jumpTitle")}</span>
            <span className="text-help text-muted">
              {t("chats.jumpHint", { shortcut })}
            </span>
          </button>
        </div>
        {recent.length > 0 ? (
          <section
            aria-labelledby={recentId}
            className="flex w-full flex-col items-start gap-2.5"
          >
            <h3
              id={recentId}
              className="m-0 text-meta font-semibold tracking-[0.06em] text-muted uppercase"
            >
              {t("chats.heardRecently")}
            </h3>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {recent.map((node) => (
                <li key={node.num}>
                  <Link
                    to="/messages/$type/$chatId"
                    params={{ type: "direct", chatId: node.num }}
                    className="flex h-10 items-center gap-2 rounded-full border border-subtle bg-surface pr-3 pl-1 text-help text-primary hover:border-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <NodeAvatar
                      initials={node.initials}
                      tone={{ kind: "node", nodeNum: node.num }}
                      size="xs"
                    />
                    {node.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </EmptyState>
    </div>
  );
};
