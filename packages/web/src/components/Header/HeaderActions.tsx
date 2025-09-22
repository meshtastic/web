import { Spinner } from "@components/UI/Spinner.tsx";
import { cn } from "@core/utils/cn.ts";
import type { ActionItem } from "@stores/headerStore.tsx";

export default function HeaderActions({ actions }: { actions: ActionItem[] }) {
  if (!actions?.length) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 md:space-x-2 shrink-0">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={action.disabled || action.isLoading}
          className={cn(
            "flex items-center space-x-2 py-2 px-3 rounded-md",
            "text-foreground transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            action.className,
          )}
          onClick={action.onClick}
          aria-label={action.ariaLabel || `Action ${action.key}`}
          aria-disabled={action.disabled}
          aria-busy={action.isLoading}
        >
          {action.icon &&
            (action.isLoading ? (
              <Spinner size="md" />
            ) : (
              <action.icon className={cn("h-5 w-5", action.iconClasses)} />
            ))}
          {action.label && (
            <span className="text-sm px-1 pt-0.5">{action.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}
