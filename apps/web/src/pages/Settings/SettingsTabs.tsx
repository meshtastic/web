import { Spinner } from "@components/UI/Spinner.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { type ComponentType, type ReactNode, Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";

export interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

export interface SettingsTab {
  /** Stable id, used in the `?tab=` search param. */
  key: string;
  label: string;
  element: ComponentType<ConfigProps>;
  isDirty?: boolean;
}

interface SettingsTabsProps extends ConfigProps {
  tabs: SettingsTab[];
}

export const DirtyDot = () => (
  <span className="absolute -top-0.5 -right-0.5 z-50 flex size-3">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-25" />
    <span className="relative inline-flex size-3 rounded-full bg-sky-500" />
  </span>
);

/** Tabs whose selection lives in the URL (`?tab=<key>`), so it can be linked. */
export const SettingsTabs = ({ tabs, onFormInit }: SettingsTabsProps) => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { tab?: string };
  const active = tabs.find((tab) => tab.key === search.tab) ?? tabs[0];

  if (!active) return null;

  return (
    <Tabs
      value={active.key}
      onValueChange={(tab) =>
        navigate({ to: ".", search: { tab }, replace: true })
      }
    >
      <TabsList className="w-full max-md:flex-nowrap max-md:overflow-x-auto">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="relative max-md:shrink-0"
          >
            {tab.label}
            {tab.isDirty && <DirtyDot />}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="max-md:px-2">
          <Suspense fallback={<Spinner size="lg" className="my-5" />}>
            <tab.element onFormInit={onFormInit} />
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
};

/** Bordered card matching a tab panel, for pages that have no tabs. */
export const SettingsCard = ({ children }: { children: ReactNode }) => (
  <div className="mt-2 rounded-md border border-slate-200 p-6 dark:border-slate-700 max-md:px-2">
    <Suspense fallback={<Spinner size="lg" className="my-5" />}>
      {children}
    </Suspense>
  </div>
);
