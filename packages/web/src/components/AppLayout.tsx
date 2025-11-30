import { AppSidebar } from "@components/AppSidebar/AppSidebar";
import { Separator } from "@components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@components/ui/sidebar";
import type React from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
