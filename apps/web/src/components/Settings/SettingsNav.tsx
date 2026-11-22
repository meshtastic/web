import { SearchField } from "@components/UI/SearchField.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { cn } from "@core/utils/cn.ts";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export interface SettingsNavSubItem {
  readonly id: string;
  readonly label: string;
  /** Has unsaved edits: amber dot. */
  readonly dirty: boolean;
}

export interface SettingsNavItem<Id extends string> {
  readonly id: Id;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Has unsaved edits: amber dot. */
  readonly dirty: boolean;
  /** Pages inside the section, listed under it (Position, Power...). */
  readonly subitems?: readonly SettingsNavSubItem[];
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
  /** The open page inside the active section, if it has subitems. */
  activeSubId?: string;
  onSelect: (id: Id) => void;
  onSelectSub?: (id: Id, subId: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

/**
 * Settings sidebar: title, search box and the grouped section list. The
 * active section is marked `aria-current="page"`; sections with unsaved
 * edits carry an amber dot. A section's subitems are listed under it; when
 * one is open, it is the current page instead of the section.
 */
const rowClasses = cn(
  "flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-body",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
);

export const SettingsNav = <Id extends string>({
  title,
  groups,
  activeId,
  activeSubId,
  onSelect,
  onSelectSub,
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
              const subitems = item.subitems ?? [];
              const subActive =
                active && subitems.some((sub) => sub.id === activeSubId);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active && !subActive ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      rowClasses,
                      active && !subActive
                        ? "bg-selected font-semibold text-primary"
                        : active
                          ? "font-semibold text-primary hover:bg-raised"
                          : "text-secondary hover:bg-raised hover:text-primary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.dirty ? <StatusDot status="dirty" size="sm" /> : null}
                  </button>
                  {subitems.length > 0 ? (
                    <ul
                      aria-label={item.label}
                      className="m-0 mt-0.5 flex list-none flex-col gap-0.5 p-0"
                    >
                      {subitems.map((sub) => {
                        const current = subActive && sub.id === activeSubId;
                        return (
                          <li key={sub.id}>
                            <button
                              type="button"
                              aria-current={current ? "page" : undefined}
                              onClick={() => onSelectSub?.(item.id, sub.id)}
                              className={cn(
                                rowClasses,
                                "min-h-8 pl-9 text-help",
                                current
                                  ? "bg-selected font-semibold text-primary"
                                  : "text-secondary hover:bg-raised hover:text-primary",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                {sub.label}
                              </span>
                              {sub.dirty ? (
                                <StatusDot status="dirty" size="sm" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
};
