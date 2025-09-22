import { useDevice, useNodeDB } from "@app/core/stores";
import { MeshAvatar } from "@components/MeshAvatar.tsx";
import { Input } from "@components/UI/input.tsx";
import { cn } from "@core/utils/cn.ts";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "../UI/sidebar.tsx";

type NodeUser = {
  shortName?: string | null;
  longName?: string | null;
};

export type NodeListItem = {
  num: number;
  user?: NodeUser | null;
  isFavorite?: boolean;
  unreadCount?: number;
};

type NavigateType = "direct" | "channel";

type NodeSidebarProps = {
  /** List of nodes to render */
  nodes: NodeListItem[];

  /** If the current view is a direct-message thread */
  isDirect?: boolean;

  /** Currently active node number (for highlighting) */
  activeNodeNum?: number | null;

  /** Called when a node row is clicked */
  onNavigate?: (type: NavigateType, id: string) => void;

  /** Clear unread count for a node */
  onResetUnread?: (nodeNum: number) => void;

  /** Whether the node currently has an error */
  hasNodeError?: (nodeNum: number) => boolean;

  /** Optional additional className for the outer Sidebar */
  className?: string;
};

/* --------------------------- Component --------------------------- */

export function NodeSidebar({
  // nodes,
  // isDirect = true,
  // activeNodeNum = null,
  // onNavigate = () => {},
  // onResetUnread = () => {},
  // hasNodeError = () => false,
  className,
}: NodeSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { t } = useTranslation();
  const { getNode, getMyNode, getNodes } = useNodeDB();
  const nodes = getNodes();

  const filteredNodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return nodes;
    }
    return nodes.filter((n) => {
      const shortName = n.user?.shortName?.toLowerCase() ?? "";
      const longName = n.user?.longName?.toLowerCase() ?? "";
      const id = String(n.num);
      return shortName.includes(q) || longName.includes(q) || id.includes(q);
    });
  }, [nodes, searchTerm]);

  return (
    <Sidebar className={cn("border-r", className)} variant="inset" side="right">
      <SidebarContent>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/70">
            <Users className="h-3.5 w-3.5" />
            {t("messages:nodes", { defaultValue: "Nodes" })}
          </SidebarGroupLabel>

          <div className="px-2 py-2">
            <label htmlFor="nodeSearch" className="sr-only">
              {t("search.nodes", { defaultValue: "Search nodes…" })}
            </label>
            {/** biome-ignore lint/correctness/useUniqueElementIds: <explanation> */}
            <Input
              id="nodeSearch"
              name="nodeSearch"
              placeholder={t("search.nodes", { defaultValue: "Search nodes…" })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNodes.map((node) => {
                const active = Boolean(isDirect && activeNodeNum === node.num);
                const hasError = hasNodeError(node.num);

                return (
                  <SidebarMenuItem key={node.num}>
                    <SidebarMenuButton
                      isActive={active}
                      className={cn(
                        "justify-between",
                        active && "bg-sidebar-accent",
                      )}
                      onClick={() => {
                        onNavigate("direct", node.num.toString());
                        onResetUnread(node.num);
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <MeshAvatar
                          text={
                            node.user?.shortName ??
                            t("messages:unknown.shortName", {
                              defaultValue: "Unknown",
                            })
                          }
                          className={cn(hasError && "text-red-500")}
                          showError={hasError}
                          showFavorite={Boolean(node.isFavorite)}
                          size="sm"
                        />
                        <span className="max-w-[9rem] truncate">
                          {node.user?.longName ??
                            t("messages:unknown.shortName", {
                              defaultValue: "Unknown",
                            })}
                        </span>
                      </div>

                      {!!node.unreadCount && node.unreadCount > 0 && (
                        <SidebarMenuBadge
                          aria-label={t("messages:unread", {
                            defaultValue: "Unread",
                          })}
                        >
                          {node.unreadCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
