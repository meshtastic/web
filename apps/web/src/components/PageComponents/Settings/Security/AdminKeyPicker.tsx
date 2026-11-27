import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import { matchesSearch } from "@core/messaging/conversationList.ts";
import type { AdminKeyCandidate } from "@core/settings/securityKeys.ts";
import { ShieldCheckIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export interface AdminKeyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: readonly AdminKeyCandidate[];
  /** Called with the chosen radio's public key (base64). */
  onPick: (key: string) => void;
}

/** Most rows to render; searching narrows the rest. */
const MAX_ROWS = 200;

/** Searchable list of known radios; picking one uses its public key. */
export const AdminKeyPicker = ({
  open,
  onOpenChange,
  candidates,
  onPick,
}: AdminKeyPickerProps) => {
  const { t } = useTranslation("config");
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
      <DialogContent className="flex h-[min(640px,80vh)] flex-col gap-3">
        <DialogClose />
        <DialogHeader className="pr-8">
          <DialogTitle>{t("securitySection.pickRadioTitle")}</DialogTitle>
          <DialogDescription>
            {t("securitySection.pickRadioDescription")}
          </DialogDescription>
        </DialogHeader>
        <SearchField
          label={t("securitySection.pickRadioSearch")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {matches.length === 0 ? (
          <p className="m-0 flex-1 py-4 text-center text-help text-muted">
            {t("securitySection.pickRadioEmpty")}
          </p>
        ) : (
          <ul className="m-0 -mx-2 min-h-0 flex-1 list-none overflow-y-auto p-0">
            {matches.map((c) => (
              <li key={c.num}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    onPick(c.key);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-control p-2 text-left hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <NodeAvatar
                    initials={c.initials}
                    tone={{ kind: "node", nodeNum: c.num }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{c.name}</span>
                    <span className="truncate text-meta text-muted">
                      {c.id}
                    </span>
                  </span>
                  {c.verified ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-meta text-accent">
                      <ShieldCheckIcon aria-hidden="true" className="size-4" />
                      {t("securitySection.keyVerified")}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
