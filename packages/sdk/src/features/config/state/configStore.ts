import { createStore } from "../../../core/signals/createStore.ts";
import type { ModuleConfig } from "../domain/ModuleConfig.ts";
import type { RadioConfig } from "../domain/RadioConfig.ts";

export function createConfigStore() {
  return {
    radio: createStore<RadioConfig>({}),
    modules: createStore<ModuleConfig>({}),
  };
}

export type ConfigStore = ReturnType<typeof createConfigStore>;
