import { Button } from "@app/components/UI/Button";
import type { Connection } from "@app/core/stores/deviceStore/types";

export function ConnectionStatusBadge({
  status,
}: {
  status: Connection["status"];
}) {
  let color = "";

  switch (status) {
    case "connected":
      color = "bg-emerald-500";
      break;
    case "connecting":
      color = "bg-amber-500";
      break;
    case "online":
      color = "bg-blue-500";
      break;
    case "error":
      color = "bg-red-500";
      break;
    default:
      color = "bg-gray-400";
  }
  return (
    <Button variant="subtle" className="inline-flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full ${color}`}
        aria-hidden="true"
      />
      <span className="text-xs capitalize text-slate-500 dark:text-slate-400">
        {status}
      </span>
    </Button>
  );
}
