import { type MentionName, parseMentions } from "@core/messaging/mentions.ts";
import { cn } from "@core/utils/cn.ts";
import { memo, useMemo } from "react";

export interface MessageTextProps {
  text: string;
  /** Current names for mentions; undefined leaves the raw token. */
  mentionName: MentionName;
  /** Opens a mentioned node's details; without it mentions aren't buttons. */
  onOpenNode?: (nodeNum: number) => void;
  /** Mentions of this node get the "you" emphasis. */
  myNodeNum?: number;
  /** On my own bubble's colours: mentions keep the text colour. */
  outgoing?: boolean;
}

/**
 * A message's text, with each `@!<hex>` mention shown as `@Name` from the
 * node's current name (so a rename shows everywhere at once) and opening
 * that node's details. A node we know no name for keeps the raw token as
 * plain text. Plain React text throughout: names are never parsed as
 * markup.
 */
export const MessageText = memo(function MessageText({
  text,
  mentionName,
  onOpenNode,
  myNodeNum,
  outgoing = false,
}: MessageTextProps) {
  const segments = useMemo(() => parseMentions(text), [text]);
  return (
    <span className="leading-[1.45] break-words whitespace-pre-wrap">
      {segments.map((segment, index) => {
        if (segment.kind === "text") {
          return segment.text;
        }
        const label = mentionName(segment.nodeNum);
        if (label === undefined) {
          return segment.raw;
        }
        const className = cn(
          "font-semibold",
          outgoing ? "underline underline-offset-2" : "text-accent",
          segment.nodeNum === myNodeNum &&
            "rounded-sm bg-accent-tint px-0.5 text-on-accent-tint",
        );
        // Index keys: a message's text never changes.
        return onOpenNode ? (
          <button
            key={index}
            type="button"
            data-mention={segment.nodeNum}
            onClick={() => onOpenNode(segment.nodeNum)}
            className={cn(
              className,
              "inline cursor-pointer text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
            )}
          >
            @{label}
          </button>
        ) : (
          <span
            key={index}
            data-mention={segment.nodeNum}
            className={className}
          >
            @{label}
          </span>
        );
      })}
    </span>
  );
});
