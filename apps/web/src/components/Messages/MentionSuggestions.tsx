import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import type { MentionCandidate } from "@core/messaging/mentions.ts";
import { cn } from "@core/utils/cn.ts";

// A listbox the text field controls (WAI-ARIA combobox pattern): a native
// <select> or <datalist> can't sit beside a textarea's caret like this.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */

/** A node the composer can suggest, with what its row shows. */
export interface MentionSuggestion extends MentionCandidate {
  /** Display name (long name, short name or the "Meshtastic 5A97" fallback). */
  readonly name: string;
  readonly initials: string;
  readonly online: boolean;
}

export interface MentionSuggestionsProps {
  id: string;
  label: string;
  suggestions: readonly MentionSuggestion[];
  /** Index of the highlighted row (the one Enter or Tab picks). */
  active: number;
  onActiveChange: (index: number) => void;
  onPick: (suggestion: MentionSuggestion) => void;
}

export const mentionOptionId = (listId: string, num: number): string =>
  `${listId}-${num}`;

/**
 * The @mention suggestions above the composer. Focus stays in the field,
 * which points at the highlighted row with `aria-activedescendant`, so the
 * keyboard is handled there; the rows take pointer and touch.
 */
export const MentionSuggestions = ({
  id,
  label,
  suggestions,
  active,
  onActiveChange,
  onPick,
}: MentionSuggestionsProps) => (
  <div
    id={id}
    role="listbox"
    aria-label={label}
    className="absolute inset-x-3 bottom-full z-20 mb-1 overflow-hidden rounded-panel border border-elevated bg-surface p-1 shadow-popover"
  >
    {suggestions.map((s, index) => (
      // Keys are the field's: it keeps focus and points at the row with
      // aria-activedescendant. The rows take pointer and touch.
      // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        key={s.num}
        id={mentionOptionId(id, s.num)}
        role="option"
        aria-selected={index === active}
        tabIndex={-1}
        // Keep focus (and the caret) in the field.
        onMouseDown={(event) => event.preventDefault()}
        onMouseMove={() => {
          if (index !== active) {
            onActiveChange(index);
          }
        }}
        onClick={() => onPick(s)}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-control p-2 pointer-coarse:min-h-11",
          index === active && "bg-raised",
        )}
      >
        <NodeAvatar
          initials={s.initials}
          tone={{ kind: "node", nodeNum: s.num }}
          presence={s.online ? "online" : undefined}
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{s.name}</span>
          <span className="truncate text-meta text-muted">
            {s.shortName ? `${s.shortName} · ${s.id}` : s.id}
          </span>
        </span>
      </div>
    ))}
  </div>
);
