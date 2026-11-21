import { CountBadge } from "@components/UI/CountBadge.tsx";
import { cn } from "@core/utils/cn.ts";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { navIcons } from "./navIcons.ts";
import { navLabelKeys } from "./shellLabels.ts";
import {
  activeDestination,
  type NavDestination,
  navPaths,
  tabBarDestinations,
} from "./navItems.ts";

export interface BottomTabBarProps {
  pathname: string;
  unreadCount: number;
}

/** Mobile replacement for the rail: Chats, Nodes, Map, Settings. */
export const BottomTabBar = ({ pathname, unreadCount }: BottomTabBarProps) => {
  const { t } = useTranslation("ui");
  const active = activeDestination(pathname);

  const labelFor = (destination: NavDestination): string =>
    destination === "messages"
      ? t("shell.chats")
      : t(navLabelKeys[destination]);

  return (
    <nav
      aria-label={t("shell.appNavigation")}
      className="grid shrink-0 grid-cols-4 border-t border-subtle bg-app pb-[max(8px,env(safe-area-inset-bottom))]"
    >
      {tabBarDestinations.map((destination) => {
        const Icon = navIcons[destination];
        const current = active === destination;
        return (
          <Link
            key={destination}
            to={navPaths[destination]}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex min-h-16 flex-col items-center justify-center gap-1 text-meta font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
              current ? "text-accent" : "text-muted hover:text-primary",
            )}
          >
            <span className="relative inline-flex">
              <Icon aria-hidden="true" className="size-6" />
              {destination === "messages" ? (
                <span aria-hidden="true" className="absolute -top-1.5 -right-3">
                  <CountBadge count={unreadCount} label={null} size="sm" />
                </span>
              ) : null}
            </span>
            {labelFor(destination)}
            {destination === "messages" && unreadCount > 0 ? (
              <span className="sr-only">
                {t("primitives.unread", { count: unreadCount })}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
};
