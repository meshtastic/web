import { Button } from "@shared/components/ui/button";
import { MonitorIcon } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";

const SerialMonitorTerminal = lazy(() => import("./SerialMonitorTerminal"));

export function SerialMonitor() {
  const { t } = useTranslation("config");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start"
        onClick={() => setOpen(true)}
      >
        <MonitorIcon className="size-5 mr-2" />
        {t(
          "settings.advanced.serialMonitor.button.open",
          "Open Serial Monitor",
        )}
      </Button>
      {open && (
        <Suspense>
          <SerialMonitorTerminal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
