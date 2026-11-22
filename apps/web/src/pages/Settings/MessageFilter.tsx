import {
  SettingsBlock,
  SettingsGroup,
  SettingsSections,
} from "@components/PageComponents/SettingsPages/SettingsSection.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Callout } from "@components/UI/Callout.tsx";
import { Card } from "@components/UI/Card.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { Input } from "@components/UI/Input.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { useMessageFilter } from "@core/kmp/hooks";
import type { AddFilterWordError } from "@core/kmp/messageFilter.ts";
import {
  parseFilterEntry,
  sortFilterEntries,
} from "@core/messaging/messageFilter.ts";
import type { MessageFilterStorageError } from "@core/storage/messageFilter.ts";
import type { Result } from "better-result";
import type { TFunction } from "i18next";
import { PlusIcon, TrashIcon } from "lucide-react";
import { type FormEvent, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConfigProps } from "./sectionProps.ts";

const errorText = (
  t: TFunction<"messages">,
  error: AddFilterWordError,
): string => {
  switch (error.kind) {
    case "empty":
      return t("filter.errorEmpty");
    case "duplicate":
      return t("filter.errorDuplicate");
    case "emptyPattern":
      return t("filter.errorEmptyPattern");
    case "invalidRegex":
      return t("filter.errorInvalidRegex", { reason: error.reason });
    case "storage":
      return t("filter.errorStorage");
  }
};

export interface MessageFilterSettingsProps {
  /** False without a connected radio: the words belong to one. */
  available: boolean;
  enabled: boolean;
  words: readonly string[];
  onEnabledChange: (
    enabled: boolean,
  ) => Promise<Result<void, MessageFilterStorageError>>;
  onAdd: (input: string) => Promise<Result<string, AddFilterWordError>>;
  onRemove: (word: string) => Promise<Result<void, MessageFilterStorageError>>;
}

/**
 * Android's Message Filter screen: the switch, an entry field (Enter or
 * Add; problems are shown under it) and the words, each removable.
 */
export const MessageFilterSettings = ({
  available,
  enabled,
  words,
  onEnabledChange,
  onAdd,
  onRemove,
}: MessageFilterSettingsProps) => {
  const { t } = useTranslation("messages");
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [switchError, setSwitchError] = useState<string | undefined>();
  const sorted = useMemo(() => sortFilterEntries(words), [words]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const added = await onAdd(input);
    if (added.isErr()) {
      setError(errorText(t, added.error));
      return;
    }
    setInput("");
    setError(undefined);
  };

  const remove = async (word: string) => {
    const removed = await onRemove(word);
    setError(removed.isErr() ? t("filter.errorStorage") : undefined);
  };

  const toggle = async (on: boolean) => {
    const saved = await onEnabledChange(on);
    setSwitchError(saved.isErr() ? t("filter.errorStorage") : undefined);
  };

  if (!available) {
    return <Callout>{t("filter.notConnected")}</Callout>;
  }

  return (
    <SettingsSections>
      <Card>
        <SettingRow
          kind="switch"
          label={t("filter.enable")}
          help={t("filter.enableDescription")}
          error={switchError}
          checked={enabled}
          onCheckedChange={(on) => void toggle(on)}
        />
      </Card>
      <SettingsGroup
        title={t("filter.words")}
        description={t("filter.wordsDescription")}
      >
        <SettingsBlock>
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(event) => void add(event)}
            noValidate
          >
            <label htmlFor={inputId} className="sr-only">
              {t("filter.inputLabel")}
            </label>
            <div className="flex items-center gap-2">
              <Input
                id={inputId}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (error) setError(undefined);
                }}
                placeholder={t("filter.inputPlaceholder")}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                variant={error ? "invalid" : "default"}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                containerClassName="min-w-0 flex-1"
              />
              <Button
                type="submit"
                variant="secondary"
                icon={<PlusIcon aria-hidden="true" className="size-4" />}
              >
                {t("filter.add")}
              </Button>
            </div>
            {error ? (
              <p
                id={errorId}
                role="alert"
                className="m-0 text-help leading-snug text-danger"
              >
                {error}
              </p>
            ) : null}
          </form>
        </SettingsBlock>
        {sorted.length === 0 ? (
          <SettingsBlock>
            <p className="m-0 text-help text-muted">{t("filter.empty")}</p>
          </SettingsBlock>
        ) : (
          <ul
            aria-label={t("filter.words")}
            className="m-0 flex list-none flex-col p-0"
          >
            {sorted.map((word) => {
              const entry = parseFilterEntry(word);
              const shown = entry.kind === "regex" ? entry.pattern : entry.word;
              return (
                <li
                  key={word}
                  className="flex items-center gap-3 border-t border-subtle py-2 pr-2 pl-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={
                        entry.kind === "regex"
                          ? "font-mono text-body break-all"
                          : "text-body break-words"
                      }
                    >
                      {shown}
                    </span>
                    <span className="text-meta text-muted">
                      {entry.kind === "regex"
                        ? t("filter.regexPattern")
                        : t("filter.wholeWord")}
                    </span>
                  </div>
                  <IconButton
                    aria-label={t("filter.remove", { word: shown })}
                    variant="danger"
                    size="touch"
                    icon={<TrashIcon className="size-4" />}
                    onClick={() => void remove(word)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </SettingsGroup>
    </SettingsSections>
  );
};

/** The Message filter settings section, for the connected radio. */
export const MessageFilter = (_props: ConfigProps) => {
  const filter = useMessageFilter();
  return (
    <MessageFilterSettings
      available={filter.available}
      enabled={filter.enabled}
      words={filter.words}
      onEnabledChange={filter.setEnabled}
      onAdd={filter.addWord}
      onRemove={filter.removeWord}
    />
  );
};
