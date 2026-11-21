import { StatusDot } from "@components/UI/StatusDot.tsx";
import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SettingsNavGroup } from "./SettingsNav.tsx";

export interface MobileSettingsListProps<Id extends string> {
  title: string;
  /** Pinned above the groups, e.g. the device card. */
  header?: ReactNode;
  groups: readonly SettingsNavGroup<Id>[];
  /** Short current value shown at the right of a row (region, role…). */
  values?: Partial<Record<Id, string>>;
  onSelect: (id: Id) => void;
}

/** Narrow-screen Settings home: grouped rows that each open a section. */
export const MobileSettingsList = <Id extends string>({
  title,
  header,
  groups,
  values,
  onSelect,
}: MobileSettingsListProps<Id>) => (
  <div className="flex flex-col gap-4.5 px-2 pt-5 pb-4">
    <h1 className="m-0 px-1 text-display font-bold">{title}</h1>
    {header}
    {groups.map((group) => (
      <section key={group.id} className="flex flex-col gap-1.5">
        <h2 className="m-0 px-1 text-meta font-semibold tracking-wider text-muted uppercase">
          {group.label}
        </h2>
        <ul className="m-0 list-none overflow-hidden rounded-panel border border-subtle bg-surface p-0">
          {group.items.map((item) => {
            const Icon = item.icon;
            const value = values?.[item.id];
            return (
              <li
                key={item.id}
                className="border-t border-subtle first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-3.5 text-left text-body text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted"
                  />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.dirty ? <StatusDot status="dirty" size="sm" /> : null}
                  {value ? (
                    <span className="text-help text-muted">{value}</span>
                  ) : null}
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    ))}
  </div>
);
