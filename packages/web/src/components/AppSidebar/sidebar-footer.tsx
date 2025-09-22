import {
  SidebarFooter as ShadcnSidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/UI/sidebar.tsx";
import { ChevronUp } from "lucide-react";
import { MeshAvatar } from "../MeshAvatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../UI/DropdownMenu.tsx";

export function SidebarFooter() {
  return (
    <ShadcnSidebarFooter className="py-4">
      <SidebarMenu>
        <SidebarMenuItem className="px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton>
                <MeshAvatar text={"EAO"} /> Username
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width]"
            >
              <DropdownMenuItem>
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </ShadcnSidebarFooter>
  );
}
