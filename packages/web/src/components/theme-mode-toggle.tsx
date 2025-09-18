import { useTheme } from "@components/theme-provider.tsx";
import { Button } from "@components/UI/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/UI/dropdown-menu.tsx";
import { Laptop, Moon, Sun } from "lucide-react";
import type { JSX } from "react";

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme();

  // Map theme -> icon + label
  const themes: Record<string, { label: string; icon: JSX.Element }> = {
    light: { label: "Light", icon: <Sun className="h-4 w-4" /> },
    dark: { label: "Dark", icon: <Moon className="h-4 w-4" /> },
    system: { label: "System", icon: <Laptop className="h-4 w-4" /> },
  };

  const current = themes[theme ?? "system"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <span className="flex items-center gap-2">
            {current?.icon}
            Current theme: {current?.label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        {Object.entries(themes).map(([key, { label, icon }]) => (
          <DropdownMenuItem key={key} onClick={() => setTheme(key)}>
            <span className="flex items-center gap-2 w-full">
              {icon}
              {label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
