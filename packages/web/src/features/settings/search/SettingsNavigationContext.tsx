import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SearchableField, SettingsSection } from "./types.ts";

interface SettingsNavigationContextValue {
  /** Current top-level section */
  activeSection: SettingsSection;
  /** Current tab within section */
  activeTab: string;
  /** Field to scroll to and highlight (fieldName) */
  highlightedField: string | null;
  /** Navigate to a specific field from search results */
  navigateToField: (field: SearchableField) => void;
  /** Set the active section */
  setActiveSection: (section: SettingsSection) => void;
  /** Set the active tab within current section */
  setActiveTab: (tab: string) => void;
  /** Clear the highlighted field */
  clearHighlight: () => void;
}

const SettingsNavigationContext =
  createContext<SettingsNavigationContextValue | null>(null);

interface SettingsNavigationProviderProps {
  children: ReactNode;
  /** Initial section */
  defaultSection?: SettingsSection;
}

/** Default tabs for each section */
const DEFAULT_TABS: Record<SettingsSection, string> = {
  radio: "lora",
  device: "user",
  module: "mqtt",
  app: "appearance",
  advanced: "administration",
};

export function SettingsNavigationProvider({
  children,
  defaultSection = "radio",
}: SettingsNavigationProviderProps) {
  const [activeSection, setActiveSectionState] =
    useState<SettingsSection>(defaultSection);
  const [activeTab, setActiveTabState] = useState(DEFAULT_TABS[defaultSection]);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  const setActiveSection = useCallback((section: SettingsSection) => {
    setActiveSectionState(section);
    setActiveTabState(DEFAULT_TABS[section]);
    setHighlightedField(null);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setHighlightedField(null);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedField(null);
  }, []);

  const navigateToField = useCallback((field: SearchableField) => {
    setActiveSectionState(field.section);
    setActiveTabState(field.tab);
    setHighlightedField(field.fieldName);
  }, []);

  // Auto-clear highlight after animation
  useEffect(() => {
    if (highlightedField) {
      const timer = setTimeout(() => {
        setHighlightedField(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightedField]);

  return (
    <SettingsNavigationContext.Provider
      value={{
        activeSection,
        activeTab,
        highlightedField,
        navigateToField,
        setActiveSection,
        setActiveTab,
        clearHighlight,
      }}
    >
      {children}
    </SettingsNavigationContext.Provider>
  );
}

export function useSettingsNavigation() {
  const context = useContext(SettingsNavigationContext);
  if (!context) {
    throw new Error(
      "useSettingsNavigation must be used within a SettingsNavigationProvider",
    );
  }
  return context;
}
