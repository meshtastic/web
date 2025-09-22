import {
  SidebarTrigger,
  SidebarHeader as UISidebarHeader,
} from "@components/UI/sidebar.tsx";
import { Heading } from "../UI/Typography/Heading.tsx";

export function SidebarHeader() {
  return (
    <UISidebarHeader className="group/logo relative flex h-12 px-4 transition-all duration-200 hover:bg-sidebar-accent/50">
      {/* Logo container - always visible */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md">
        <img src="/logo.svg" alt="Meshtastic logo" className="" />
      </div>

      <Heading
        as="h1"
        className="ml-2 text-sm truncate font-semibold tracking-wide transition-all duration-200 group-data-[collapsible=icon]:data-[state=collapsed]:hidden"
      >
        Meshtastic
      </Heading>

      <SidebarTrigger
        aria-label="Expand sidebar"
        className="
          absolute right-2 hidden opacity-0 transition-all duration-200 ease-in-out
          hover:bg-sidebar-accent hover:scale-110
          group-hover/logo:opacity-100
          group-data-[collapsible=icon]:data-[state=expanded]:flex
        "
      />
    </UISidebarHeader>
  );
}
