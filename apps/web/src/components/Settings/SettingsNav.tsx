import { SearchField } from "@components/UI/SearchField.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { cn } from "@core/utils/cn.ts";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface SettingsNavItem<Id extends string> {
  readonly id: Id;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Has unsaved edits: amber dot. */
  readonly dirty: boolean;
}

export interface SettingsNavGroup<Id extends string> {
  readonly id: string;
  readonly label: string;
  readonly items: readonly SettingsNavItem<Id>[];
}

export interface SettingsNavProps<Id extends string> {
  title: string;
  groups: readonly SettingsNavGroup<Id>[];
  activeId: Id | undefined;
  onSelect: (id: Id) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

/**
 * Settings sidebar: title, search box and the grouped section list. The
 * active section is marked `aria-current="page"`; sections with unsaved
 * edits carry an amber dot.
 */
export const SettingsNav = <Id extends string>({
  title,
  groups,
  activeId,
  onSelect,
  query,
  onQueryChange,
}: SettingsNavProps<Id>) => {
  const { t } = useTranslation("config");
  const headingId = useId();

  return (
    <nav aria-labelledby={headingId} className="flex flex-col pb-3">
      <div className="flex flex-col gap-3 px-2 pt-4 pb-2.5">
        <h1 id={headingId} className="text-title font-bold">
          {title}
        </h1>
        <SearchField
          label={t("settingsLayout.search")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {groups.length === 0 ? (
        <output className="block px-3 py-4 text-help text-muted">
          {t("settingsLayout.noResults", { query: query.trim() })}
        </output>
      ) : null}
      {groups.map((group) => (
        <section key={group.id} aria-label={group.label}>
          <h2 className="px-2.5 pt-3.5 pb-1.5 text-meta font-semibold tracking-wider text-muted uppercase">
            {group.label}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {group.items.map((item) => {
              const active = item.id === activeId;
              const Icon = item.icon;
              const className = cn(
                "flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-body",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
                active
                  ? "bg-selected font-semibold text-primary"
                  : "text-secondary hover:bg-raised hover:text-primary",
              );
              const content = (
                <>
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.dirty ? <StatusDot status="dirty" size="sm" /> : null}
                </>
              );
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                    className={className}
                  >
                    {content}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
};
