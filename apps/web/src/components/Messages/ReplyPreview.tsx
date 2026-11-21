import { ReplyIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ReplyPreviewProps {
  /** Who wrote the message being replied to ("yourself" for mine). */
  name: string;
  excerpt: string;
  onCancel: () => void;
}

/** Strip above the composer while replying: "Replying to NAME" and an excerpt. */
export const ReplyPreview = ({
  name,
  excerpt,
  onCancel,
}: ReplyPreviewProps) => {
  const { t } = useTranslation("messages");
  return (
    <div className="flex items-center gap-2.5 rounded-control border-l-[3px] border-accent bg-inset py-2 pr-2 pl-3">
      <ReplyIcon aria-hidden="true" className="size-4 shrink-0 text-accent" />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-meta font-semibold text-accent">
          {t("reply.replyingTo", { name })}
        </span>
        <span className="truncate text-help text-secondary">{excerpt}</span>
      </span>
      <button
        type="button"
        aria-label={t("reply.cancel")}
        onClick={onCancel}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <XIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
};
