import { AppSidebar } from "./AppSidebar";
import { Separator } from "@shared/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@shared/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
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
        <div className="flex-1 min-h-0">{children}</div>
      </SidebarInset>
    </>
  );
}
