// "use client";

// import { Button } from "@components/UI/button.tsx";
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "@components/UI/collapsible.tsx";
// import { Input } from "@components/UI/input.tsx";
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarGroupLabel,
//   SidebarInset,
//   SidebarMenu,
//   SidebarMenuBadge,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarProvider,
//   SidebarSeparator,
// } from "@components/UI/sidebar.tsx";
// import { Outlet } from "@tanstack/react-router";
// import {
//   ChevronDown,
//   Hash,
//   Layers,
//   MapIcon,
//   MessageCircle,
//   Radio,
//   Send,
//   Settings,
//   Users,
// } from "lucide-react";
// import { SidebarHeader } from "./sidebar-header.tsx";
// import { MeshAvatar } from "../MeshAvatar.tsx";

// export function AppSidebar() {
//   return (
//     <Sidebar className="border-r-0">
//       <SidebarHeader />
//       <SidebarContent>
//         <SidebarGroup>
//           <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
//             Navigation
//           </SidebarGroupLabel>
//           <SidebarGroupContent>
//             <SidebarMenu>
//               <SidebarMenuItem>
//                 <SidebarMenuButton isActive={true}>
//                   <MessageCircle className="h-4 w-4" />
//                   <span>Messages</span>
//                 </SidebarMenuButton>
//               </SidebarMenuItem>
//               <SidebarMenuItem>
//                 <SidebarMenuButton>
//                   <MapIcon className="h-4 w-4" />
//                   <span>Map</span>
//                 </SidebarMenuButton>
//               </SidebarMenuItem>
//               <SidebarMenuItem>
//                 <Collapsible defaultOpen={false}>
//                   <CollapsibleTrigger asChild>
//                     <SidebarMenuButton className="w-full justify-between">
//                       <div className="flex items-center gap-2">
//                         <Settings className="h-4 w-4" />
//                         <span>Config</span>
//                       </div>
//                       <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
//                     </SidebarMenuButton>
//                   </CollapsibleTrigger>
//                   <CollapsibleContent className="ml-6 mt-1 space-y-1">
//                     <SidebarMenuButton size="sm">
//                       <Radio className="h-3 w-3" />
//                       <span className="text-xs">Radio Config</span>
//                     </SidebarMenuButton>
//                     <SidebarMenuButton size="sm">
//                       <Layers className="h-3 w-3" />
//                       <span className="text-xs">Module Config</span>
//                     </SidebarMenuButton>
//                     <SidebarMenuButton size="sm">
//                       <Hash className="h-3 w-3" />
//                       <span className="text-xs">Channel Config</span>
//                     </SidebarMenuButton>
//                   </CollapsibleContent>
//                 </Collapsible>
//               </SidebarMenuItem>
//               <SidebarMenuItem>
//                 <SidebarMenuButton>
//                   <Users className="h-4 w-4" />
//                   <span>Nodes</span>
//                   <SidebarMenuBadge>203</SidebarMenuBadge>
//                 </SidebarMenuButton>
//               </SidebarMenuItem>
//             </SidebarMenu>
//           </SidebarGroupContent>
//         </SidebarGroup>

//         <SidebarSeparator />

//         <SidebarGroup>
//           <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
//             Channels
//           </SidebarGroupLabel>
//           <SidebarGroupContent>
//             <SidebarMenu>
//               <SidebarMenuItem>
//                 <SidebarMenuButton
//                   isActive={true}
//                   className="bg-sidebar-accent"
//                 >
//                   <div className="flex h-2 w-2 rounded-full bg-blue-500" />
//                   <span>Primary</span>
//                 </SidebarMenuButton>
//               </SidebarMenuItem>
//             </SidebarMenu>
//           </SidebarGroupContent>
//         </SidebarGroup>

//         <div className="mt-auto p-4 space-y-2 text-xs text-sidebar-foreground/60">
//           <div>Plugged in</div>
//           <div>Version: 4.3b.V</div>
//           <div>Firmware: 2.7.6.834c365</div>
//           <div className="pt-2 border-t border-sidebar-border">
//             <button className="text-sidebar-foreground/70 hover:text-sidebar-foreground" type="button">
//               Change Color Scheme
//             </button>
//           </div>
//           <div>
//             <button className="text-sidebar-foreground/70 hover:text-sidebar-foreground" type="button">
//               Change Device Name
//             </button>
//           </div>
//           <div>
//             <button className="text-sidebar-foreground/70 hover:text-sidebar-foreground" type="button">
//               Command Menu
//             </button>
//           </div>
//           <div>
//             <button className="text-sidebar-foreground/70 hover:text-sidebar-foreground" type="button">
//               Change Language: English
//             </button>
//           </div>
//         </div>
//       </SidebarContent>

//       <SidebarFooter>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton>
//               <MeshAvatar text="EAO1" size="sm" />
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarFooter>
//     </Sidebar>

//   );
// }

import { Button } from "@components/UI/button.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@components/UI/collapsible.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SidebarHeader as UISidebarHeader,
} from "@components/UI/sidebar.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/tooltip.tsx";
import {
  ChevronDown,
  Hash,
  Layers,
  MapIcon,
  MessageCircle,
  Radio,
  Settings,
  Users,
} from "lucide-react";
import { MeshAvatar } from "../MeshAvatar.tsx";
import { SidebarHeader } from "./sidebar-header.tsx";

/**
 * Utility: when the sidebar is collapsed (rail), hide text but keep icons visible.
 * We rely on `data-collapsed` set by the Sidebar primitive when `collapsible="icon"`.
 * Any `.sidebar-label` will hide in collapsed mode.
 */
export const labelClass =
  "sidebar-label group-data-[collapsible=icon]:data-[state=collapsed]:hidden";

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header */}
      <SidebarMenuItem>
        <SidebarHeader />
      </SidebarMenuItem>

      {/* Optional: a thin rail you can grab/hover on (like ChatGPT) */}
      <SidebarRail />

      <SidebarContent>
        <TooltipProvider delayDuration={200}>
          {/* -------- Primary Nav -------- */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
              <span className={labelClass}>Navigation</span>
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {/* Messages */}
                <SidebarMenuItem>
                  <TooltipWrapper label="Messages">
                    <SidebarMenuButton isActive>
                      <MessageCircle className="h-4 w-4" />
                      <span className={labelClass}>Messages</span>
                    </SidebarMenuButton>
                  </TooltipWrapper>
                </SidebarMenuItem>

                {/* Map */}
                <SidebarMenuItem>
                  <TooltipWrapper label="Map">
                    <SidebarMenuButton>
                      <MapIcon className="h-4 w-4" />
                      <span className={labelClass}>Map</span>
                    </SidebarMenuButton>
                  </TooltipWrapper>
                </SidebarMenuItem>

                {/* Config */}
                <SidebarMenuItem>
                  <Collapsible
                    defaultOpen={false}
                    className="group/collapsible"
                  >
                    <CollapsibleTrigger asChild>
                      <TooltipWrapper label="Config">
                        <SidebarMenuButton className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span className={labelClass}>Config</span>
                          </div>
                          {/* Keep chevron visible in expanded mode; hidden in rail */}
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[collapsible=icon]:data-[state=collapsed]:hidden" />
                        </SidebarMenuButton>
                      </TooltipWrapper>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="ml-6 mt-1 space-y-1 group-data-[collapsible=icon]:data-[state=collapsed]:hidden">
                      <SidebarMenuButton size="sm">
                        <Radio className="h-3 w-3" />
                        <span className="text-xs">Radio Config</span>
                      </SidebarMenuButton>
                      <SidebarMenuButton size="sm">
                        <Layers className="h-3 w-3" />
                        <span className="text-xs">Module Config</span>
                      </SidebarMenuButton>
                      <SidebarMenuButton size="sm">
                        <Hash className="h-3 w-3" />
                        <span className="text-xs">Channel Config</span>
                      </SidebarMenuButton>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>

                {/* Nodes */}
                <SidebarMenuItem>
                  <TooltipWrapper label="Nodes">
                    <SidebarMenuButton>
                      <Users className="h-4 w-4" />
                      <span className={labelClass}>Nodes</span>
                      {/* Keep badge, it’ll sit beside the icon in rail mode */}
                      <SidebarMenuBadge>203</SidebarMenuBadge>
                    </SidebarMenuButton>
                  </TooltipWrapper>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* -------- Channels -------- */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">
              <span className={labelClass}>Channels</span>
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <TooltipWrapper label="Primary">
                    <SidebarMenuButton isActive className="bg-sidebar-accent">
                      <div className="flex h-2 w-2 rounded-full bg-blue-500" />
                      <span className={labelClass}>Primary</span>
                    </SidebarMenuButton>
                  </TooltipWrapper>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* -------- Footer Info (auto-hides text when collapsed) -------- */}
          <div className="mt-auto p-4 space-y-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:data-[state=collapsed]:hidden">
            <div>Plugged in</div>
            <div>Version: 4.3b.V</div>
            <div>Firmware: 2.7.6.834c365</div>
            <div className="pt-2 border-t border-sidebar-border">
              <button
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                type="button"
              >
                Change Color Scheme
              </button>
            </div>
            <div>
              <button
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                type="button"
              >
                Change Device Name
              </button>
            </div>
            <div>
              <button
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                type="button"
              >
                Command Menu
              </button>
            </div>
            <div>
              <button
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
                type="button"
              >
                Change Language: English
              </button>
            </div>
          </div>
        </TooltipProvider>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipWrapper label="Account">
              <SidebarMenuButton>
                <MeshAvatar text="EAO1" size="sm" />
                <span className={labelClass}>Account</span>
              </SidebarMenuButton>
            </TooltipWrapper>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

/** Shows a tooltip only when the sidebar is in collapsed (icon) mode. */
function TooltipWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* keep button focus/hover behavior intact */}
        <div className="w-full">{children}</div>
      </TooltipTrigger>
      {/* Hidden when expanded; visible when collapsed */}
      <TooltipContent
        side="right"
        className="group-data-[collapsible=icon]:data-[state=collapsed]:block hidden"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
