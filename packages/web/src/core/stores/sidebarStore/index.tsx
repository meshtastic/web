import type React from "react";
import { createContext, useContext, useMemo, useState } from "react";

interface SidebarContextProps {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined,
);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const toggleSidebar = useMemo(
    () => () => {
      setIsCollapsed((prev) => !prev);
    },
    [],
  );

  const value = useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggleSidebar,
    }),
    [isCollapsed, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextProps => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
