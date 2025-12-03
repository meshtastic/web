import { Sheet, SheetContent, SheetTrigger } from "@components/ui/sheet";
import { Button } from "@components/ui/button";
import { Menu } from "lucide-react";
import { ReactNode } from "react";

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
}

export const SettingsLayout = ({
  children,
  sidebar,
  header,
}: SettingsLayoutProps) => {
  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:border-r md:flex-col">
        {sidebar}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {header}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>

      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {sidebar}
        </SheetContent>
      </Sheet>
    </div>
  );
};
