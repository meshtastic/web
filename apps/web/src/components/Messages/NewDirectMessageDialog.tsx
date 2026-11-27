import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import { matchesSearch } from "@core/messaging/conversationList.ts";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface DirectMessageCandidate {
  readonly num: number;
  readonly name: string;
  readonly shortName?: string;
  readonly id: string;
  readonly initials: string;
  /** "heard 5 minutes ago", or nothing when never heard. */
  readonly heard?: string;
  readonly online: boolean;
  /** This radio can manage the node remotely. */
  readonly adminAccess?: boolean;
}

export interface NewDirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Messageable nodes, most recently heard first. */
  candidates: readonly DirectMessageCandidate[];
  onSelect: (nodeNum: number) => void;
}

/** Most rows to render; searching narrows the rest. */
const MAX_ROWS = 200;

/** Pick a known node to start (or reopen) a direct conversation with. */
export const NewDirectMessageDialog = ({
  open,
  onOpenChange,
  candidates,
  onSelect,
}: NewDirectMessageDialogProps) => {
  const { t } = useTranslation("messages");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const matches = useMemo(
    () =>
      candidates
        .filter((c) => matchesSearch([c.name, c.shortName, c.id], deferred))
        .slice(0, MAX_ROWS),
    [candidates, deferred],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{t("newDm.title")}</DialogTitle>
          <DialogDescription>{t("newDm.description")}</DialogDescription>
        </DialogHeader>
        <SearchField
          label={t("newDm.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {matches.length === 0 ? (
          <p className="m-0 py-4 text-center text-help text-muted">
            {t("newDm.empty")}
          </p>
        ) : (
          <ul className="m-0 -mx-2 min-h-0 flex-1 list-none overflow-y-auto p-0">
            {matches.map((c) => (
              <li key={c.num}>
                <button
                  type="button"
                  onClick={() => onSelect(c.num)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-control p-2 text-left hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <NodeAvatar
                    initials={c.initials}
                    tone={{ kind: "node", nodeNum: c.num }}
                    presence={c.online ? "online" : undefined}
                    adminAccess={c.adminAccess}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{c.name}</span>
                    <span className="truncate text-meta text-muted">
                      {c.heard ? `${c.id} · ${c.heard}` : c.id}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
