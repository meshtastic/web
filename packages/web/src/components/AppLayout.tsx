import { AppSidebar } from "@components/AppSidebar/AppSidebar";
import { Separator } from "@components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import type React from "react";
import { useTranslation } from "react-i18next";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("ui");

  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-h-0">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="-ml-1" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sidebar.collapse")}</p>
               </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="mr-2 h-14" />
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </>
  );
}
