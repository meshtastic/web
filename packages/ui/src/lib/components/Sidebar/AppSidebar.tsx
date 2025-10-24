import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  children?: React.ReactNode;
  logo?: {
    src: string;
    alt: string;
  };
  title?: string;
  navigationLabel?: string;
  variant?: "sidebar" | "inset";
  footer?: React.ReactNode;
}

export interface NavLink {
  name: string;
  icon: LucideIcon;
  page: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  items?: NavLink[];
  onClick?: () => void;
}

export interface SidebarSectionProps {
  label?: string;
  items: NavLink[];
}

const AppSidebar = ({
  children,
  logo,
  title,
  navigationLabel,
  items,
  footer,
  variant,
  ...props
}: SidebarSectionProps & AppSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader
        className={cn(
          "h-14 mt-2 flex-shrink-0 transition-all duration-300 ease-in-out",
        )}
      >
        <div className="flex items-center">
          {logo && (
            <img
              src={logo.src}
              alt={logo.alt}
              className="size-10 flex-shrink-0 rounded-xl"
            />
          )}
          {title && (
            <h2
              className={cn(
                "text-xl font-semibold whitespace-nowrap",
                "transition-all duration-300 ease-in-out",
                isCollapsed
                  ? "opacity-0 max-w-0 invisible ml-0"
                  : "opacity-100 max-w-xs visible ml-2",
              )}
            >
              {title}
            </h2>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="mt-4">
          {navigationLabel && (
            <SidebarGroupLabel
              className={cn(
                "transition-all duration-300 ease-in-out",
                "whitespace-nowrap overflow-hidden",
                isCollapsed ? "max-w-0 opacity-0 invisible" : "max-w-full",
              )}
            >
              {navigationLabel}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((link) => {
                // Check if this item has sub-items
                if (link.items && link.items.length > 0) {
                  return (
                    <Collapsible
                      key={link.name}
                      asChild
                      defaultOpen={link.active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            onClick={link.onClick}
                            disabled={link.disabled}
                            tooltip={isCollapsed ? link.name : undefined}
                          >
                            {link.icon && <link.icon className="size-5" />}
                            <span>{link.name}</span>
                            {link.count !== undefined && link.count > 0 && (
                              <Badge
                                variant="default"
                                className="ml-auto bg-blue-500 text-white text-xs"
                              >
                                {link.count}
                              </Badge>
                            )}
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {link.items.map((subLink) => (
                              <SidebarMenuSubItem key={subLink.name}>
                                <SidebarMenuSubButton
                                  onClick={subLink.onClick}
                                  isActive={subLink.active}
                                >
                                  {subLink.icon && (
                                    <subLink.icon className="size-4" />
                                  )}
                                  <span>{subLink.name}</span>
                                  {subLink.count !== undefined &&
                                    subLink.count > 0 && (
                                      <Badge
                                        variant="default"
                                        className="ml-auto bg-blue-500 text-white text-xs"
                                      >
                                        {subLink.count}
                                      </Badge>
                                    )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={link.name}>
                    <SidebarMenuButton
                      onClick={link.onClick}
                      isActive={link.active}
                      disabled={link.disabled}
                      tooltip={isCollapsed ? link.name : undefined}
                    >
                      {link.icon && <link.icon className="size-5" />}
                      <span>{link.name}</span>
                      {link.count !== undefined && link.count > 0 && (
                        <Badge
                          variant="default"
                          className="ml-auto bg-blue-500 text-white text-xs"
                        >
                          {link.count}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {children && (
          <div
            className={cn("flex-1 min-h-0", isCollapsed && "overflow-hidden")}
          >
            {children}
          </div>
        )}
      </SidebarContent>

      {footer && <SidebarFooter className="pt-4">{footer}</SidebarFooter>}
    </Sidebar>
  );
};

AppSidebar.displayName = "AppSidebar";

export default AppSidebar;
