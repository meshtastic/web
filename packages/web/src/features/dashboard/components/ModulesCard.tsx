import { Badge } from "@shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";

interface Module {
  name: string;
  enabled: boolean;
}

interface ModulesCardProps {
  modules: Module[];
}

export function ModulesCard({ modules }: ModulesCardProps) {
  const enabledModules = modules.filter((m) => m.enabled);
  const disabledModules = modules.filter((m) => !m.enabled);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-primary"
              aria-hidden="true"
            >
              <path d="m7.5 4.27 9 5.15" />
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="m3.3 7 8.7 5 8.7-5" />
              <path d="M12 22V12" />
            </svg>
            Modules
          </span>
          <Badge variant="secondary" className="text-xs">
            {enabledModules.length} of {modules.length} enabled
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Enabled Modules */}
        {enabledModules.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Enabled
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {enabledModules.map((mod) => (
                <Badge key={mod.name} variant="default" className="text-xs">
                  {mod.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Disabled Modules */}
        {disabledModules.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Disabled
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {disabledModules.map((mod) => (
                <Badge
                  key={mod.name}
                  variant="secondary"
                  className="text-xs opacity-60"
                >
                  {mod.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
