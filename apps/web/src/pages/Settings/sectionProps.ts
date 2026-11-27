import { useRouterState } from "@tanstack/react-router";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod/v4";

/** Props every settings section receives. */
export interface ConfigProps {
  /** Hands the section's form to the page, for Save / Reset and validity. */
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

/**
 * Search params every settings page takes: `?node=<node number>` manages
 * that node remotely. Anything that isn't a node number is dropped, which
 * opens this radio's settings.
 */
export const settingsSearchSchema = z.object({
  node: z.number().int().positive().max(0xffffffff).optional().catch(undefined),
});

const tabSearchSchema = z.object({ tab: z.string().optional() });

/**
 * The `?tab=` of the current settings URL: a Device configuration
 * subsection or a module key.
 */
export function useSettingsTab(): string | undefined {
  const search = useRouterState({ select: (state) => state.location.search });
  return tabSearchSchema.safeParse(search).data?.tab;
}
