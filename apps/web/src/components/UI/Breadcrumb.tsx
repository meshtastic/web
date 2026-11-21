import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface BreadcrumbProps {
  /** Ordered trail; the last item is the current location. */
  items: readonly ReactNode[];
  className?: string;
}

/** "Configuration · EAO1" style trail above a page title. */
export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  const { t } = useTranslation("ui");
  return (
    <nav aria-label={t("primitives.breadcrumb")} className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-help text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            // The trail is positional and never reorders.
            <li
              key={index}
              aria-current={last ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5",
                last && "text-secondary",
              )}
            >
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              {item}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
