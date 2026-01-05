import { Separator } from "@shared/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@shared/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";
import { useDevice } from "@state/index.ts";
import type React from "react";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "./AppSidebar.tsx";
import { DialogManager } from "@app/shared/components/Dialog/DialogManager.tsx";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("ui");
  const device = useDevice();
  const isRemoteAdmin = device.remoteAdminTargetNode !== null;

  return (
    <div
      className={cn(
        "flex flex-1 min-h-0",
        isRemoteAdmin && "ring-2 ring-red-500 ring-inset",
      )}
    >
      <DialogManager />
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
    </div>
  );
}
