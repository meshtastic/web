import { createStore } from "../../../core/signals/createStore.ts";
import type { ModuleConfig } from "../domain/ModuleConfig.ts";
import type { RadioConfig } from "../domain/RadioConfig.ts";

export function createConfigStore() {
  return {
    radio: createStore<RadioConfig>({}),
    modules: createStore<ModuleConfig>({}),
    cannedMessages: createStore<string | undefined>(undefined),
    ringtone: createStore<string | undefined>(undefined),
  };
}

export type ConfigStore = ReturnType<typeof createConfigStore>;
